import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { isFodderMod } from "@/lib/dashboard/fodderMods";
import { findSyndicateMod } from "@/lib/dashboard/syndicates";
import { pruneSnapshotHistory } from "@/lib/market";
import { readThresholds, scanOneItem } from "@/lib/scan/scanItem";
import type { ScanThresholds } from "@/lib/scan/scanItem";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TIME_BUDGET_MS = 45_000;
const RUNNING_LOCK_WINDOW_MS = 15 * 60 * 1000;
const WATCHLIST_STALE_MS = 3 * 60 * 60 * 1000;
const PRIORITY_CATALOG_STALE_MS = 4 * 60 * 60 * 1000;
const HISTORY_RETENTION_DAYS = 7;
const MAX_EXTRA_BATCHES = 2;
const WATCHLIST_BATCH_FRACTION = 0.75;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function buildPriorityBatch(
  supabase: SupabaseClient<Database>,
  limit: number,
): Promise<string[]> {
  if (limit <= 0) return [];

  const [watchlistResult, stashResult] = await Promise.all([
    supabase.from("watchlist").select("url_name"),
    supabase.from("mod_stash").select("url_name"),
  ]);
  if (watchlistResult.error) {
    throw new Error(`Failed to read watchlist: ${watchlistResult.error.message}`);
  }
  if (stashResult.error) {
    throw new Error(`Failed to read mod_stash: ${stashResult.error.message}`);
  }

  const pinnedUrlNames = new Set([
    ...(watchlistResult.data ?? []).map((pin) => pin.url_name),
    ...(stashResult.data ?? []).map((pin) => pin.url_name),
  ]);

  // Also prioritize all Syndicate augments and casual fodder rare mods (Ducats & Relics are live via /v1/tools/ducats).
  const syndicateAndModUrls = new Set<string>();
  const existingSet = new Set<string>();
  const PAGE = 1000;
  let offset = 0;
  for (;;) {
    const { data: itemsPage, error: itemsError } = await supabase
      .from("items")
      .select("url_name, item_name")
      .order("url_name", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (itemsError) {
      throw new Error(`Failed to resolve priority items: ${itemsError.message}`);
    }
    for (const item of itemsPage ?? []) {
      existingSet.add(item.url_name);
      if (findSyndicateMod(item.item_name) || isFodderMod(item.item_name)) {
        syndicateAndModUrls.add(item.url_name);
      }
    }
    if (!itemsPage || itemsPage.length < PAGE) break;
    offset += PAGE;
  }

  const candidateUrlNames = [
    ...new Set([...pinnedUrlNames, ...syndicateAndModUrls]),
  ].filter((urlName) => existingSet.has(urlName));
  if (candidateUrlNames.length === 0) return [];

  const scannedAtByUrlName = new Map<string, string>();
  const CHUNK = 200;
  for (let i = 0; i < candidateUrlNames.length; i += CHUNK) {
    const chunk = candidateUrlNames.slice(i, i + CHUNK);
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("item_snapshots")
      .select("url_name, scanned_at")
      .in("url_name", chunk);
    if (snapshotsError) {
      throw new Error(`Failed to read priority snapshots: ${snapshotsError.message}`);
    }
    for (const snapshot of snapshots ?? []) {
      scannedAtByUrlName.set(snapshot.url_name, snapshot.scanned_at);
    }
  }

  const now = Date.now();

  return candidateUrlNames
    .map((urlName) => {
      const scannedAt = scannedAtByUrlName.get(urlName);
      const ageMs = scannedAt ? now - new Date(scannedAt).getTime() : Number.POSITIVE_INFINITY;
      const isUserPin = pinnedUrlNames.has(urlName);
      const staleLimit = isUserPin ? WATCHLIST_STALE_MS : PRIORITY_CATALOG_STALE_MS;
      return { urlName, ageMs, isUserPin, isStale: ageMs > staleLimit };
    })
    .filter((entry) => entry.isStale)
    .sort((a, b) => Number(b.isUserPin) - Number(a.isUserPin) || b.ageMs - a.ageMs)
    .slice(0, limit)
    .map((entry) => entry.urlName);
}

interface ScanBatchSummary {
  watchlistScanned: number;
  generalScanned: number;
  spreadAlerts: number;
  priceDropAlerts: number;
  errors: string[];
  offset: number;
  total: number;
  cycleCompleted: boolean;
  pruned: number | null;
}

async function runScanBatch(
  supabase: SupabaseClient<Database>,
  batchSize: number,
  thresholds: ScanThresholds,
  cursorOffset: number,
): Promise<ScanBatchSummary> {
  const { count: total, error: countError } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true });
  if (countError) {
    throw new Error(`Failed to count items: ${countError.message}`);
  }
  const totalItems = total ?? 0;

  if (totalItems === 0) {
    return {
      watchlistScanned: 0,
      generalScanned: 0,
      spreadAlerts: 0,
      priceDropAlerts: 0,
      errors: [],
      offset: 0,
      total: 0,
      cycleCompleted: false,
      pruned: null,
    };
  }

  const watchlistCap = Math.max(0, Math.floor(batchSize * WATCHLIST_BATCH_FRACTION));
  const watchlistBatch = await buildPriorityBatch(supabase, watchlistCap);
  const remaining = Math.max(0, batchSize - watchlistBatch.length);

  let pageOffset = cursorOffset;
  if (remaining > 0 && pageOffset >= totalItems) {
    pageOffset = 0;
  }

  let generalUrlNames: string[] = [];
  let fetchedCount = 0;
  if (remaining > 0) {
    const { data, error } = await supabase
      .from("items")
      .select("url_name")
      .order("url_name", { ascending: true })
      .range(pageOffset, pageOffset + remaining - 1);
    if (error) {
      throw new Error(`Failed to page items: ${error.message}`);
    }
    fetchedCount = data?.length ?? 0;
    const watchlistSet = new Set(watchlistBatch);
    generalUrlNames = (data ?? [])
      .map((row) => row.url_name)
      .filter((urlName) => !watchlistSet.has(urlName));
  }

  const offsetAfterPage = remaining > 0 ? pageOffset + fetchedCount : cursorOffset;
  let newOffset = offsetAfterPage;
  let cycleCompleted = false;
  if (offsetAfterPage >= totalItems) {
    newOffset = 0;
    cycleCompleted = true;
  }

  let spreadAlerts = 0;
  let priceDropAlerts = 0;
  const errors: string[] = [];

  for (const urlName of [...watchlistBatch, ...generalUrlNames]) {
    try {
      const result = await scanOneItem(supabase, urlName, thresholds);
      if (result.spreadAlert) spreadAlerts += 1;
      if (result.priceDropAlert) priceDropAlerts += 1;
    } catch (err) {
      errors.push(`${urlName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const { error: cursorUpdateError } = await supabase
    .from("scan_cursor")
    .update({ offset: newOffset })
    .eq("id", 1);
  if (cursorUpdateError) {
    throw new Error(`Failed to advance scan_cursor: ${cursorUpdateError.message}`);
  }

  let pruned: number | null = null;
  if (cycleCompleted) {
    pruned = await pruneSnapshotHistory(supabase, HISTORY_RETENTION_DAYS);
  }

  return {
    watchlistScanned: watchlistBatch.length,
    generalScanned: generalUrlNames.length,
    spreadAlerts,
    priceDropAlerts,
    errors,
    offset: newOffset,
    total: totalItems,
    cycleCompleted,
    pruned,
  };
}

async function setCursorStatus(
  supabase: SupabaseClient<Database>,
  status: Database["public"]["Tables"]["scan_cursor"]["Row"]["status"],
): Promise<void> {
  await supabase
    .from("scan_cursor")
    .update({ status, last_run_at: new Date().toISOString() })
    .eq("id", 1);
}

function mergeSummaries(
  a: ScanBatchSummary,
  b: ScanBatchSummary,
): ScanBatchSummary {
  return {
    watchlistScanned: a.watchlistScanned + b.watchlistScanned,
    generalScanned: a.generalScanned + b.generalScanned,
    spreadAlerts: a.spreadAlerts + b.spreadAlerts,
    priceDropAlerts: a.priceDropAlerts + b.priceDropAlerts,
    errors: [...a.errors, ...b.errors],
    offset: b.offset,
    total: b.total,
    cycleCompleted: a.cycleCompleted || b.cycleCompleted,
    pruned: b.pruned ?? a.pruned,
  };
}

async function handleScan(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const nowIso = new Date(startedAt).toISOString();
  const staleCutoffIso = new Date(startedAt - RUNNING_LOCK_WINDOW_MS).toISOString();
  const supabase = createServiceClient();

  const { data: claimedRow, error: claimError } = await supabase
    .from("scan_cursor")
    .update({ status: "running", last_run_at: nowIso })
    .eq("id", 1)
    .or(`status.neq.running,last_run_at.is.null,last_run_at.lt.${staleCutoffIso}`)
    .select("*")
    .maybeSingle();

  if (claimError) {
    return NextResponse.json(
      { ok: false, error: `Failed to acquire scan lock: ${claimError.message}` },
      { status: 500 },
    );
  }

  if (!claimedRow) {
    const { data: existingRow, error: checkError } = await supabase
      .from("scan_cursor")
      .select("id")
      .eq("id", 1)
      .maybeSingle();

    if (checkError || !existingRow) {
      return NextResponse.json(
        { ok: false, error: `scan_cursor row missing: ${checkError?.message ?? "not found"}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Scan already running", skipped: true },
      { status: 409 },
    );
  }

  const cursorRow = claimedRow;

  const batchSize = envInt("SCAN_BATCH_SIZE", 20);
  const thresholds = readThresholds();

  try {
    let summary = await runScanBatch(supabase, batchSize, thresholds, cursorRow.offset);
    let extraBatches = 0;

    while (
      extraBatches < MAX_EXTRA_BATCHES &&
      summary.total > 0 &&
      Date.now() - startedAt < TIME_BUDGET_MS
    ) {
      const next = await runScanBatch(supabase, batchSize, thresholds, summary.offset);
      summary = mergeSummaries(summary, next);
      extraBatches += 1;
    }

    await setCursorStatus(supabase, "idle");

    return NextResponse.json({
      ok: true,
      scanned: summary.watchlistScanned + summary.generalScanned,
      watchlistScanned: summary.watchlistScanned,
      generalScanned: summary.generalScanned,
      spreadAlerts: summary.spreadAlerts,
      priceDropAlerts: summary.priceDropAlerts,
      offset: summary.offset,
      total: summary.total,
      cycleCompleted: summary.cycleCompleted,
      pruned: summary.pruned,
      errors: summary.errors,
      extraBatches,
    });
  } catch (err) {
    await setCursorStatus(supabase, "error");
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return handleScan(request);
}

export async function GET(request: Request): Promise<NextResponse> {
  return handleScan(request);
}

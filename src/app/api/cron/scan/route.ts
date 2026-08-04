import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { pruneSnapshotHistory } from "@/lib/market";
import { readThresholds, scanOneItem } from "@/lib/scan/scanItem";
import type { ScanThresholds } from "@/lib/scan/scanItem";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Wall-clock budget per invocation before we stop starting new work (Vercel Hobby ~60s cap). */
const TIME_BUDGET_MS = 45_000;
/**
 * Soft lock: reject new root triggers while status=running and last_run_at is
 * newer than this. After the window, treat as stuck and allow takeover.
 */
const RUNNING_LOCK_WINDOW_MS = 15 * 60 * 1000;
/** Watchlist pins are considered stale after this long — roughly one scan.yml cycle (every 4h). */
const WATCHLIST_STALE_MS = 3 * 60 * 60 * 1000;
const HISTORY_RETENTION_DAYS = 7;
/** Max in-process follow-up batches after the first (no HTTP self-chain). */
const MAX_EXTRA_BATCHES = 1;
/**
 * Watchlist may fill at most this fraction of a batch so catalog cursor still
 * advances when many pins are stale (Bugbot: watchlist starvation).
 */
const WATCHLIST_BATCH_FRACTION = 0.5;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Selects up to `limit` priority url_names (watchlist + mod_stash) that are
 * stale (no snapshot yet, or scanned longer than `WATCHLIST_STALE_MS` ago),
 * most-stale first. Entries with no matching row in `items` are orphans and
 * skipped — never returned here.
 */
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

  const pinnedUrlNames = [
    ...new Set([
      ...(watchlistResult.data ?? []).map((pin) => pin.url_name),
      ...(stashResult.data ?? []).map((pin) => pin.url_name),
    ]),
  ];
  if (pinnedUrlNames.length === 0) return [];

  const { data: existingItems, error: itemsError } = await supabase
    .from("items")
    .select("url_name")
    .in("url_name", pinnedUrlNames);
  if (itemsError) {
    throw new Error(`Failed to resolve priority items: ${itemsError.message}`);
  }

  const existingSet = new Set((existingItems ?? []).map((item) => item.url_name));
  const presentUrlNames = pinnedUrlNames.filter((urlName) => existingSet.has(urlName));
  if (presentUrlNames.length === 0) return [];

  const { data: snapshots, error: snapshotsError } = await supabase
    .from("item_snapshots")
    .select("url_name, scanned_at")
    .in("url_name", presentUrlNames);
  if (snapshotsError) {
    throw new Error(`Failed to read priority snapshots: ${snapshotsError.message}`);
  }

  const scannedAtByUrlName = new Map(
    (snapshots ?? []).map((snapshot) => [snapshot.url_name, snapshot.scanned_at]),
  );
  const now = Date.now();

  return presentUrlNames
    .map((urlName) => {
      const scannedAt = scannedAtByUrlName.get(urlName);
      const ageMs = scannedAt ? now - new Date(scannedAt).getTime() : Number.POSITIVE_INFINITY;
      return { urlName, ageMs };
    })
    .filter((entry) => entry.ageMs > WATCHLIST_STALE_MS)
    .sort((a, b) => b.ageMs - a.ageMs)
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

  // Cursor may be stale (catalog shrank since last run) — restart the page from 0.
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
  const supabase = createServiceClient();

  const { data: cursorRow, error: cursorFetchError } = await supabase
    .from("scan_cursor")
    .select("*")
    .eq("id", 1)
    .single();

  if (cursorFetchError || !cursorRow) {
    return NextResponse.json(
      { ok: false, error: `scan_cursor row missing: ${cursorFetchError?.message ?? "not found"}` },
      { status: 500 },
    );
  }

  if (
    cursorRow.status === "running" &&
    cursorRow.last_run_at &&
    Date.now() - new Date(cursorRow.last_run_at).getTime() < RUNNING_LOCK_WINDOW_MS
  ) {
    return NextResponse.json(
      { ok: false, error: "Scan already running", skipped: true },
      { status: 409 },
    );
  }

  await setCursorStatus(supabase, "running");

  const batchSize = envInt("SCAN_BATCH_SIZE", 20);
  const thresholds = readThresholds();

  try {
    let summary = await runScanBatch(supabase, batchSize, thresholds, cursorRow.offset);
    let extraBatches = 0;

    // In-process follow-up batch (no HTTP ?chain= bypass / nested serverless await).
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

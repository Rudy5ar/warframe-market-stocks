import "server-only";

import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import {
  fastRefreshTopOrders,
  loadSyndicateCatalogItems,
} from "@/lib/scan/fastSyndicateRefresh";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_BATCH_LIMIT = 75;
const MAX_BATCH_LIMIT = 100;
const TIME_BUDGET_MS = 42_000;

function parseBatchLimit(request: Request): number {
  const raw = new URL(request.url).searchParams.get("limit");
  if (!raw) return DEFAULT_BATCH_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_BATCH_LIMIT;
  return Math.min(parsed, MAX_BATCH_LIMIT);
}

async function handleSyndicateRefresh(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const limit = parseBatchLimit(request);
    const syndicateItems = await loadSyndicateCatalogItems(supabase);

    if (syndicateItems.length === 0) {
      return NextResponse.json({
        ok: true,
        refreshed: 0,
        failedCount: 0,
        totalSyndicateMods: 0,
        durationMs: 0,
      });
    }

    const allUrls = syndicateItems.map((item) => item.urlName);
    const { data: snaps, error: snapError } = await supabase
      .from("item_snapshots")
      .select("url_name, scanned_at")
      .in("url_name", allUrls);

    if (snapError) {
      throw new Error(`Failed to read syndicate snapshots: ${snapError.message}`);
    }

    const scannedAtByUrl = new Map(
      (snaps ?? []).map((row) => [row.url_name, new Date(row.scanned_at).getTime()]),
    );

    const stalest = [...allUrls]
      .sort((a, b) => {
        const aTime = scannedAtByUrl.get(a) ?? 0;
        const bTime = scannedAtByUrl.get(b) ?? 0;
        return aTime - bTime;
      })
      .slice(0, limit);

    const summary = await fastRefreshTopOrders(supabase, stalest, {
      timeBudgetMs: TIME_BUDGET_MS,
    });

    return NextResponse.json({
      ok: true,
      refreshed: summary.items.length,
      failedCount: summary.failed.length,
      failed: summary.failed.slice(0, 10),
      totalSyndicateMods: syndicateItems.length,
      durationMs: summary.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return handleSyndicateRefresh(request);
}

export async function GET(request: Request): Promise<NextResponse> {
  return handleSyndicateRefresh(request);
}

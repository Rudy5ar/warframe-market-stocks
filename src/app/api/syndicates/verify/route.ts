import "server-only";

import { NextResponse } from "next/server";

import {
  fastRefreshTopOrders,
  loadSyndicateCatalogItems,
  resolveSyndicateIndex,
} from "@/lib/scan/fastSyndicateRefresh";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TOP_VERIFY_LIMIT = 12;
const COOLDOWN_MS = 60_000;

const lastVerifyBySyndicate = new Map<string, number>();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => null)) as { syndicate?: unknown } | null;
    if (!body || typeof body.syndicate !== "string") {
      return NextResponse.json({ ok: false, error: "Missing syndicate" }, { status: 400 });
    }

    const resolved = resolveSyndicateIndex(body.syndicate);
    if (!resolved) {
      return NextResponse.json({ ok: false, error: "Unknown syndicate" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const allSyndicateItems = await loadSyndicateCatalogItems(supabase);
    const syndicateUrls = allSyndicateItems
      .filter((item) => item.syndicateIndices.includes(resolved.index))
      .map((item) => item.urlName);

    if (syndicateUrls.length === 0) {
      return NextResponse.json({
        ok: true,
        syndicate: resolved.name,
        cached: true,
        refreshedAt: new Date().toISOString(),
        items: [],
      });
    }

    const { data: snaps, error: snapError } = await supabase
      .from("item_snapshots")
      .select("url_name, lowest_sell, highest_buy, spread, roi_pct, scanned_at")
      .in("url_name", syndicateUrls);

    if (snapError) {
      throw new Error(`Failed to read snapshots: ${snapError.message}`);
    }

    const snapByUrl = new Map((snaps ?? []).map((row) => [row.url_name, row]));

    // Pick top highest-selling mods for this syndicate so the user can trust the top of the table immediately.
    const ranked = [...syndicateUrls].sort((a, b) => {
      const aSell = snapByUrl.get(a)?.lowest_sell ?? -1;
      const bSell = snapByUrl.get(b)?.lowest_sell ?? -1;
      return bSell - aSell;
    });

    const targetUrls = ranked.slice(0, TOP_VERIFY_LIMIT);
    const now = Date.now();
    const lastRun = lastVerifyBySyndicate.get(resolved.name) ?? 0;

    // Also respect DB freshness across serverless instances: if all targets were scanned < 60s ago, return DB rows.
    const allAlreadyFresh = targetUrls.every((urlName) => {
      const scannedAt = snapByUrl.get(urlName)?.scanned_at;
      return scannedAt ? now - new Date(scannedAt).getTime() < COOLDOWN_MS : false;
    });

    if (now - lastRun < COOLDOWN_MS || allAlreadyFresh) {
      return NextResponse.json({
        ok: true,
        syndicate: resolved.name,
        cached: true,
        refreshedAt: new Date().toISOString(),
        items: targetUrls.map((urlName) => {
          const snap = snapByUrl.get(urlName);
          return {
            urlName,
            lowestSell: snap?.lowest_sell ?? null,
            highestBuy: snap?.highest_buy ?? null,
            spread: snap?.spread ?? null,
            roiPct: snap?.roi_pct ?? null,
            scannedAt: snap?.scanned_at ?? new Date().toISOString(),
          };
        }),
      });
    }

    lastVerifyBySyndicate.set(resolved.name, now);

    const summary = await fastRefreshTopOrders(supabase, targetUrls, {
      timeBudgetMs: 18_000,
    });

    return NextResponse.json({
      ok: true,
      syndicate: resolved.name,
      cached: false,
      refreshedAt: new Date().toISOString(),
      items: summary.items,
      failedCount: summary.failed.length,
      durationMs: summary.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

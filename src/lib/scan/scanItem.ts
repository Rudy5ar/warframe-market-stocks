import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_MIN_SNIPE_VOLUME,
  PRICE_DROP_RATIO,
  computeMedian48h,
  computeSpreadMetrics,
  isPriceDrop,
  isSpreadOpportunity,
} from "@/lib/market";
import type { SpreadMetrics } from "@/lib/market";
import type { Database } from "@/lib/supabase/database.types";
import { getItemOrders, getItemStatistics } from "@/lib/wfm";

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

export interface ScanThresholds {
  minSpread: number;
  minRoiPct: number;
  priceDropFactor: number;
  minSnipeVolume: number;
  fetchStats: boolean;
}

export function readThresholds(): ScanThresholds {
  return {
    minSpread: envFloat("MIN_SPREAD", 5),
    minRoiPct: envFloat("MIN_ROI_PCT", 15),
    priceDropFactor: envFloat("PRICE_DROP_FACTOR", PRICE_DROP_RATIO),
    minSnipeVolume: envInt("MIN_SNIPE_VOLUME", DEFAULT_MIN_SNIPE_VOLUME),
    // MVP simplicity: batches are small (~20 items), so fetching statistics
    // for every item in the batch is cheap enough to just always do it.
    fetchStats: envBool("SCAN_STATS_EVERY_BATCH", true),
  };
}

export interface ScannedItemResult {
  urlName: string;
  spreadAlert: boolean;
  priceDropAlert: boolean;
}

/** Fetches orders (+ optionally statistics) for one item, writes its snapshot/history/alerts. */
export async function scanOneItem(
  supabase: SupabaseClient<Database>,
  urlName: string,
  thresholds: ScanThresholds,
): Promise<ScannedItemResult> {
  const orders = await getItemOrders(urlName);
  const metrics: SpreadMetrics = computeSpreadMetrics(orders);

  let median48h: number | null = null;
  let volume48h: number | null = null;

  if (thresholds.fetchStats) {
    const stats = await getItemStatistics(urlName);
    median48h = computeMedian48h(stats);
    volume48h = stats.statistics_closed["48hours"].reduce(
      (sum, entry) => sum + entry.volume,
      0,
    );
  }

  const scannedAt = new Date().toISOString();
  const snapshotRow = {
    url_name: urlName,
    lowest_sell: metrics.lowestSell,
    highest_buy: metrics.highestBuy,
    spread: metrics.spread,
    roi_pct: metrics.roiPct,
    median_48h: median48h,
    volume_48h: volume48h,
    scanned_at: scannedAt,
  };

  const { error: snapshotError } = await supabase
    .from("item_snapshots")
    .upsert(snapshotRow, { onConflict: "url_name" });
  if (snapshotError) {
    throw new Error(`Failed to upsert snapshot for ${urlName}: ${snapshotError.message}`);
  }

  const { error: historyError } = await supabase
    .from("item_snapshot_history")
    .insert(snapshotRow);
  if (historyError) {
    throw new Error(`Failed to append history for ${urlName}: ${historyError.message}`);
  }

  const spreadAlert = isSpreadOpportunity(
    metrics,
    { minSpread: thresholds.minSpread, minRoiPct: thresholds.minRoiPct },
    volume48h ?? undefined,
  );

  const priceDropAlert = isPriceDrop(metrics.lowestSell, median48h, {
    factor: thresholds.priceDropFactor,
    minVolume: thresholds.minSnipeVolume,
    volume: volume48h,
  });

  if (spreadAlert) {
    const { error } = await supabase.from("alerts").upsert(
      {
        type: "spread",
        url_name: urlName,
        payload: {
          spread: metrics.spread,
          roi_pct: metrics.roiPct,
          lowest_sell: metrics.lowestSell,
          highest_buy: metrics.highestBuy,
        },
      },
      { onConflict: "type,url_name,alert_day", ignoreDuplicates: true },
    );
    if (error) {
      throw new Error(`Failed to write spread alert for ${urlName}: ${error.message}`);
    }
  }

  if (priceDropAlert) {
    const { error } = await supabase.from("alerts").upsert(
      {
        type: "price_drop",
        url_name: urlName,
        payload: {
          lowest_sell: metrics.lowestSell,
          median_48h: median48h,
        },
      },
      { onConflict: "type,url_name,alert_day", ignoreDuplicates: true },
    );
    if (error) {
      throw new Error(`Failed to write price_drop alert for ${urlName}: ${error.message}`);
    }
  }

  return { urlName, spreadAlert, priceDropAlert };
}

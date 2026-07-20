import { filterActionableOrders } from "@/lib/wfm";
import type { WfmOrder } from "@/lib/wfm";

/**
 * Thresholds for flagging a spread/ROI opportunity. `minVolume` is optional
 * because volume comes from the statistics endpoint (`WfmStatisticEntry.volume`),
 * not from orders — callers that only have orders should omit it.
 */
export interface SpreadThresholds {
  minSpread: number;
  minRoiPct: number;
  minVolume?: number;
}

/** Project defaults: spread >= 5p, ROI >= 15%. No volume floor by default. */
export const DEFAULT_SPREAD_THRESHOLDS: SpreadThresholds = {
  minSpread: 5,
  minRoiPct: 15,
};

export interface SpreadMetrics {
  lowestSell: number | null;
  highestBuy: number | null;
  /** `lowestSell - highestBuy`. `null` if either side has no actionable orders. */
  spread: number | null;
  /** `(spread / highestBuy) * 100`. `null` if `spread` is `null` or `highestBuy` is 0. */
  roiPct: number | null;
}

/**
 * Computes spread/ROI metrics from an item's orders. Filters out unreachable
 * users (`offline`) via `filterActionableOrders` before taking the lowest
 * sell and highest buy price, matching the project's actionable-price rules.
 */
export function computeSpreadMetrics(orders: WfmOrder[]): SpreadMetrics {
  const actionable = filterActionableOrders(orders);

  const sellPrices = actionable
    .filter((order) => order.order_type === "sell")
    .map((order) => order.platinum);
  const buyPrices = actionable
    .filter((order) => order.order_type === "buy")
    .map((order) => order.platinum);

  const lowestSell = sellPrices.length > 0 ? Math.min(...sellPrices) : null;
  const highestBuy = buyPrices.length > 0 ? Math.max(...buyPrices) : null;

  if (lowestSell === null || highestBuy === null) {
    return { lowestSell, highestBuy, spread: null, roiPct: null };
  }

  const spread = lowestSell - highestBuy;
  const roiPct = highestBuy > 0 ? (spread / highestBuy) * 100 : null;

  return { lowestSell, highestBuy, spread, roiPct };
}

/**
 * Whether `metrics` clears the given thresholds. Pass `volume` (e.g. from
 * `WfmStatisticEntry.volume` / `volume_48h`) if `thresholds.minVolume` is set —
 * without it, a configured `minVolume` always fails the check.
 */
export function isSpreadOpportunity(
  metrics: SpreadMetrics,
  thresholds: SpreadThresholds = DEFAULT_SPREAD_THRESHOLDS,
  volume?: number,
): boolean {
  if (metrics.spread === null || metrics.roiPct === null) {
    return false;
  }

  if (metrics.spread < thresholds.minSpread) {
    return false;
  }

  if (metrics.roiPct < thresholds.minRoiPct) {
    return false;
  }

  if (thresholds.minVolume !== undefined) {
    if (volume === undefined || volume < thresholds.minVolume) {
      return false;
    }
  }

  return true;
}

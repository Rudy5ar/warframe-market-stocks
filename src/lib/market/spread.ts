import { filterActionableOrders } from "../wfm/actionable";
import type { WfmOrder } from "../wfm/types";

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
  /** Second-cheapest in-game sell. `null` if fewer than two actionable sells. */
  nextSell: number | null;
  /** `nextSell - lowestSell`. `null` if `nextSell` is missing. */
  spread: number | null;
  /** `(spread / lowestSell) * 100`. `null` if `spread` is `null` or `lowestSell` is 0. */
  roiPct: number | null;
}

/**
 * Next in-game ask, derived from persisted `lowest_sell + spread`.
 * `null` when a flip gap was not stored (fewer than two in-game sells).
 */
export function nextSellPrice(
  lowestSell: number | null,
  spread: number | null,
): number | null {
  if (lowestSell === null || spread === null) return null;
  return lowestSell + spread;
}

/**
 * Computes spread/ROI from in-game visible orders. Buy walls are stored as
 * `highestBuy` for display only — flip math is cheapest sell vs the next sell.
 */
export function computeSpreadMetrics(orders: WfmOrder[]): SpreadMetrics {
  const actionable = filterActionableOrders(orders);

  const sellPrices = actionable
    .filter((order) => order.order_type === "sell")
    .map((order) => order.platinum)
    .sort((a, b) => a - b);
  const buyPrices = actionable
    .filter((order) => order.order_type === "buy")
    .map((order) => order.platinum);

  const lowestSell = sellPrices[0] ?? null;
  const nextSell = sellPrices.length >= 2 ? sellPrices[1] : null;
  const highestBuy = buyPrices.length > 0 ? Math.max(...buyPrices) : null;

  if (lowestSell === null || nextSell === null) {
    return { lowestSell, highestBuy, nextSell, spread: null, roiPct: null };
  }

  const spread = nextSell - lowestSell;
  const roiPct = lowestSell > 0 ? (spread / lowestSell) * 100 : null;

  return { lowestSell, highestBuy, nextSell, spread, roiPct };
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

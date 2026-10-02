import { filterActionableOrders } from "../wfm/actionable";
import type { WfmOrder } from "../wfm/types";

export interface SpreadThresholds {
  minSpread: number;
  minRoiPct: number;
  minVolume?: number;
}

export const DEFAULT_SPREAD_THRESHOLDS: SpreadThresholds = {
  minSpread: 5,
  minRoiPct: 15,
};

export interface SpreadMetrics {
  lowestSell: number | null;
  highestBuy: number | null;
  nextSell: number | null;
  spread: number | null;
  roiPct: number | null;
}

export function nextSellPrice(
  lowestSell: number | null,
  spread: number | null,
): number | null {
  if (lowestSell === null || spread === null) return null;
  return lowestSell + spread;
}

export function computeSpreadMetrics(orders: WfmOrder[]): SpreadMetrics {
  const actionable = filterActionableOrders(orders).map((order) => ({
    order,
    unit: Math.round(order.platinum / Math.max(order.per_trade ?? 1, 1)),
    variant: `${order.rank ?? ""}|${order.subtype ?? ""}`,
  }));

  const cheapest = actionable
    .filter((o) => o.order.order_type === "sell")
    .sort((a, b) => a.unit - b.unit)[0];
  const sameVariant = cheapest
    ? actionable.filter((o) => o.variant === cheapest.variant)
    : actionable;

  const sellPrices = sameVariant
    .filter((o) => o.order.order_type === "sell")
    .map((o) => o.unit)
    .sort((a, b) => a - b);
  const buyPrices = sameVariant.filter((o) => o.order.order_type === "buy").map((o) => o.unit);

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

import { filterActionableOrders } from "@/lib/wfm";
import type { WfmOrder } from "@/lib/wfm";

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
  spread: number | null;
  roiPct: number | null;
}

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

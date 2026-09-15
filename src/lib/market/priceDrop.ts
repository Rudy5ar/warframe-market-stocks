import type { WfmItemStatistics } from "@/lib/wfm";

export const PRICE_DROP_RATIO = 0.85;

export const DEFAULT_MIN_SNIPE_VOLUME = 5;

export function computeMedian48h(statistics: WfmItemStatistics): number | null {
  const activePoints = statistics.statistics_closed["48hours"].filter(
    (entry) => entry.volume > 0,
  );

  if (activePoints.length === 0) {
    return null;
  }

  const medians = activePoints.map((entry) => entry.median).sort((a, b) => a - b);
  const mid = Math.floor(medians.length / 2);

  return medians.length % 2 === 0
    ? (medians[mid - 1] + medians[mid]) / 2
    : medians[mid];
}

export interface PriceDropOptions {
  factor?: number;
  minVolume?: number;
  volume?: number | null;
}

export function isPriceDrop(
  lowestSell: number | null,
  median48h: number | null,
  options: PriceDropOptions = {},
): boolean {
  if (lowestSell === null || median48h === null) {
    return false;
  }

  const factor = options.factor ?? PRICE_DROP_RATIO;
  if (lowestSell >= median48h * factor) {
    return false;
  }

  const minVolume = options.minVolume ?? DEFAULT_MIN_SNIPE_VOLUME;
  if (minVolume > 0) {
    const volume = options.volume ?? null;
    if (volume === null || volume < minVolume) {
      return false;
    }
  }

  return true;
}

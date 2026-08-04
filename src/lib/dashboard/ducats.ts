import ducatEntries from "./data/ducats.json";

export interface DucatEntry {
  urlName: string;
  ducats: number;
}

export const DUCAT_CATALOG: DucatEntry[] = ducatEntries as DucatEntry[];

export const DEFAULT_MIN_PLAT_PER_DUCAT = 0.5;

export type DucatRecommendation = "sell" | "junk" | "unknown";

export function recommendDucatAction(
  lowestSell: number | null,
  ducats: number,
  minPlatPerDucat: number = DEFAULT_MIN_PLAT_PER_DUCAT,
): DucatRecommendation {
  if (lowestSell === null || ducats <= 0) return "unknown";
  const ratio = lowestSell / ducats;
  return ratio >= minPlatPerDucat ? "sell" : "junk";
}

export function platPerDucat(lowestSell: number | null, ducats: number): number | null {
  if (lowestSell === null || ducats <= 0) return null;
  return lowestSell / ducats;
}

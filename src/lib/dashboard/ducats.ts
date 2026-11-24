import ducatEntries from "./data/ducats.json";

export interface DucatEntry {
  urlName: string;
  ducats: number;
}

export const DUCAT_CATALOG: DucatEntry[] = ducatEntries as DucatEntry[];

export const DUCAT_TIERS = [15, 25, 45, 65, 100] as const;
export type DucatTier = (typeof DUCAT_TIERS)[number];

export const DEFAULT_MIN_PLAT_PER_DUCAT = 0.5;
export const JUNK_DUCATS_PER_PLAT = 12;
export const SELL_DUCATS_PER_PLAT = 8;

export type DucatRecommendation = "sell" | "borderline" | "junk" | "unknown";

export function ducatsPerPlat(lowestSell: number | null, ducats: number): number | null {
  if (lowestSell === null || lowestSell <= 0 || ducats <= 0) return null;
  return ducats / lowestSell;
}

export function platPerDucat(lowestSell: number | null, ducats: number): number | null {
  if (lowestSell === null || ducats <= 0) return null;
  return lowestSell / ducats;
}

export function recommendDucatAction(
  lowestSell: number | null,
  ducats: number,
): DucatRecommendation {
  const dpp = ducatsPerPlat(lowestSell, ducats);
  if (dpp === null) return "unknown";
  if (dpp >= JUNK_DUCATS_PER_PLAT) return "junk";
  if (dpp < SELL_DUCATS_PER_PLAT) return "sell";
  return "borderline";
}

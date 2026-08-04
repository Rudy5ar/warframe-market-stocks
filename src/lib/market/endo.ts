/** Unranked dissolve Endo by rarity (wiki Dissolution table). */
export type ModRarity = "common" | "uncommon" | "rare" | "legendary";

export const UNRANKED_ENDO: Record<ModRarity, number> = {
  common: 5,
  uncommon: 10,
  rare: 15,
  legendary: 20,
};

/** Default: list if lowest sell clears this many platinum. */
export const DEFAULT_MIN_MOD_SELL_PLAT = 5;

const RARITY_TAGS: ModRarity[] = ["legendary", "rare", "uncommon", "common"];

/** Best-effort rarity from WFM `items.tags` (lowercase). */
export function rarityFromTags(tags: string[] | null | undefined): ModRarity | null {
  if (!tags || tags.length === 0) return null;
  const lower = new Set(tags.map((tag) => tag.toLowerCase()));
  for (const rarity of RARITY_TAGS) {
    if (lower.has(rarity)) return rarity;
  }
  return null;
}

export function endoForRarity(rarity: ModRarity | null): number | null {
  if (!rarity) return null;
  return UNRANKED_ENDO[rarity];
}

export type ModRecommendation = "list" | "dissolve" | "unknown";

export function recommendModAction(
  lowestSell: number | null,
  minSellPlat: number = DEFAULT_MIN_MOD_SELL_PLAT,
): ModRecommendation {
  if (lowestSell === null) return "unknown";
  return lowestSell >= minSellPlat ? "list" : "dissolve";
}

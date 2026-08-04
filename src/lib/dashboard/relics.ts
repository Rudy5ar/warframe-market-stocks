import relicEntries from "./data/relics.json";

export type RelicEra = "Lith" | "Meso" | "Neo" | "Axi" | "Requiem" | string;

export interface RelicDrop {
  name: string;
  urlName: string | null;
  rarity: string;
  chanceIntact: number;
  chanceRadiant: number | null;
}

export interface RelicEntry {
  name: string;
  era: RelicEra;
  code: string;
  vaulted: boolean;
  drops: RelicDrop[];
}

export const RELIC_CATALOG: RelicEntry[] = relicEntries as RelicEntry[];

export const RELIC_ERAS = ["Lith", "Meso", "Neo", "Axi", "Requiem"] as const;

export function computeRelicEv(
  drops: RelicDrop[],
  prices: Map<string, number | null>,
  mode: "intact" | "radiant",
): number | null {
  let total = 0;
  let any = false;

  for (const drop of drops) {
    if (!drop.urlName) continue;
    const chance = mode === "intact" ? drop.chanceIntact : drop.chanceRadiant;
    if (chance === null || chance <= 0) continue;
    const price = prices.get(drop.urlName);
    if (price === null || price === undefined) continue;
    total += (chance / 100) * price;
    any = true;
  }

  return any ? total : null;
}

import "server-only";

import { getDucatBoard } from "./ducatBoard";
import { getMarketableMods, getModStash } from "./modStash";
import {
  fetchSparklines,
  getLiveRecentDeals,
  getMarketDeals,
  getSyndicateAugments,
} from "./queries";
import { getRelicBoard } from "./relicBoard";
import type {
  DealRow,
  DucatBoardRow,
  MarketableModRow,
  ModStashRow,
  RelicBoardRow,
  SyndicateSection,
} from "./types";

export interface HomeListMod {
  urlName: string;
  itemName: string;
  thumb: string | null;
  lowestSell: number | null;
}

export interface HomeBriefing {
  spotlightDeals: DealRow[];
  liveCount: number;
  cheapCount: number;
  spikeCount: number;
  syndicates: SyndicateSection[];
  ducatJunk: DucatBoardRow[];
  ducatSell: DucatBoardRow[];
  relics: RelicBoardRow[];
  stashListMods: ModStashRow[];
  fodderMods: MarketableModRow[];
}

export async function getHomeBriefing(): Promise<HomeBriefing> {
  const [
    liveDeals,
    cheapDeals,
    spikeDeals,
    syndicates,
    ducatJunk,
    ducatSell,
    relics,
    stash,
    fodderMods,
  ] = await Promise.all([
    getLiveRecentDeals(12, 5),
    getMarketDeals("cheap", 24, 5),
    getMarketDeals("spike", 12, 5),
    getSyndicateAugments(),
    getDucatBoard("ducats_per_plat", 8),
    getDucatBoard("sell_plat", 8),
    getRelicBoard({ vaulted: "unvaulted", sort: "radiant", limit: 8 }),
    getModStash(),
    getMarketableMods(8),
  ]);

  const picks: DealRow[] = [];
  for (const deal of liveDeals) {
    if (picks.length >= 2) break;
    picks.push(deal);
  }
  if (spikeDeals[0] && !picks.some((p) => p.urlName === spikeDeals[0].urlName) && picks.length < 3) {
    picks.push(spikeDeals[0]);
  }
  for (const deal of [...liveDeals, ...cheapDeals]) {
    if (picks.length >= 3) break;
    if (!picks.some((p) => p.urlName === deal.urlName)) {
      picks.push(deal);
    }
  }

  const sparklines = await fetchSparklines(picks.map((p) => p.urlName));
  const spotlightDeals = picks.map((deal) => ({
    ...deal,
    sparkline: sparklines.get(deal.urlName) ?? [],
  }));

  return {
    spotlightDeals,
    liveCount: liveDeals.length,
    cheapCount: cheapDeals.length,
    spikeCount: spikeDeals.length,
    syndicates,
    ducatJunk,
    ducatSell,
    relics,
    stashListMods: stash.filter((row) => row.recommendation === "list").slice(0, 6),
    fodderMods,
  };
}

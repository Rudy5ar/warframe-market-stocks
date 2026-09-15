import "server-only";

import { getModStash } from "./modStash";
import { getRecentAlerts, getTopOpportunities } from "./queries";
import { getRelicBoard } from "./relicBoard";
import type { AlertRow, OpportunityRow, RelicBoardRow } from "./types";

export interface HomeListMod {
  urlName: string;
  itemName: string;
  thumb: string | null;
  lowestSell: number | null;
}

export interface HomeBriefing {
  flips: OpportunityRow[];
  drops: AlertRow[];
  listMods: HomeListMod[];
  relic: RelicBoardRow | null;
}

/** Session queues for the command-center home page. */
export async function getHomeBriefing(): Promise<HomeBriefing> {
  const [flips, alerts, stash, relics] = await Promise.all([
    getTopOpportunities(3),
    getRecentAlerts(20),
    getModStash(),
    getRelicBoard({ vaulted: "unvaulted", sort: "radiant", limit: 1 }),
  ]);

  const listMods: HomeListMod[] = stash
    .filter((row) => row.recommendation === "list")
    .slice(0, 3)
    .map((row) => ({
      urlName: row.urlName,
      itemName: row.itemName ?? row.urlName,
      thumb: row.thumb,
      lowestSell: row.lowestSell,
    }));

  return {
    flips,
    drops: alerts.filter((row) => row.type === "price_drop").slice(0, 2),
    listMods,
    relic: relics[0] ?? null,
  };
}

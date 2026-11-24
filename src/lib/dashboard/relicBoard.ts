import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { getLiveDucatFeed } from "@/lib/wfm/live";

import { RELIC_CATALOG, computeRelicEv } from "./relics";
import type { RelicEntry } from "./relics";
import type { RelicBoardRow } from "./types";

export type { RelicBoardRow };

async function loadPartPrices(
  urlNames: string[],
): Promise<Map<string, number | null>> {
  const supabase = createServiceClient();
  const prices = new Map<string, number | null>();
  const CHUNK = 200;

  const liveDucatFeed = await getLiveDucatFeed();

  // Map url_name -> WFM item id so live /v1/tools/ducats prices cover all Prime drops in 1 call.
  const idByUrl = new Map<string, string>();
  for (let i = 0; i < urlNames.length; i += CHUNK) {
    const chunk = urlNames.slice(i, i + CHUNK);
    if (chunk.length === 0) continue;
    const { data, error } = await supabase
      .from("items")
      .select("id, url_name")
      .in("url_name", chunk);
    if (error) throw new Error(`getRelicBoard: ${error.message}`);
    for (const row of data ?? []) {
      idByUrl.set(row.url_name, row.id);
    }
  }

  const missingFromLive: string[] = [];
  for (const urlName of urlNames) {
    const itemId = idByUrl.get(urlName);
    const live = itemId ? liveDucatFeed.get(itemId) : undefined;
    if (live && live.median > 0) {
      prices.set(urlName, live.median);
    } else {
      missingFromLive.push(urlName);
    }
  }

  for (let i = 0; i < missingFromLive.length; i += CHUNK) {
    const chunk = missingFromLive.slice(i, i + CHUNK);
    if (chunk.length === 0) continue;
    const { data, error } = await supabase
      .from("item_snapshots")
      .select("url_name, lowest_sell")
      .in("url_name", chunk);
    if (error) throw new Error(`getRelicBoard: ${error.message}`);
    for (const row of data ?? []) {
      prices.set(row.url_name, row.lowest_sell);
    }
  }

  for (const urlName of urlNames) {
    if (!prices.has(urlName)) prices.set(urlName, null);
  }

  return prices;
}

export interface RelicBoardFilters {
  era?: string | null;
  vaulted?: "all" | "vaulted" | "unvaulted";
  sort?: "radiant" | "intact";
  limit?: number;
}

export async function getRelicBoard(
  filters: RelicBoardFilters = {},
): Promise<RelicBoardRow[]> {
  const era = filters.era && filters.era !== "all" ? filters.era : null;
  const vaulted = filters.vaulted ?? "all";
  const sort = filters.sort ?? "radiant";
  const limit = filters.limit ?? 60;

  let catalog: RelicEntry[] = RELIC_CATALOG;
  if (era) {
    catalog = catalog.filter((relic) => relic.era === era);
  }
  if (vaulted === "vaulted") {
    catalog = catalog.filter((relic) => relic.vaulted);
  } else if (vaulted === "unvaulted") {
    catalog = catalog.filter((relic) => !relic.vaulted);
  }

  const partUrls = [
    ...new Set(
      catalog.flatMap((relic) =>
        relic.drops.map((drop) => drop.urlName).filter((url): url is string => Boolean(url)),
      ),
    ),
  ];
  const prices = await loadPartPrices(partUrls);

  const rows: RelicBoardRow[] = catalog.map((relic) => {
    const pricedDrops = relic.drops.filter(
      (drop) => drop.urlName && prices.get(drop.urlName) != null,
    ).length;
    return {
      name: relic.name,
      era: relic.era,
      code: relic.code,
      vaulted: relic.vaulted,
      intactEv: computeRelicEv(relic.drops, prices, "intact"),
      radiantEv: computeRelicEv(relic.drops, prices, "radiant"),
      pricedDrops,
      totalDrops: relic.drops.length,
    };
  });

  rows.sort((a, b) => {
    const av = sort === "intact" ? a.intactEv : a.radiantEv;
    const bv = sort === "intact" ? b.intactEv : b.radiantEv;
    if (av === null && bv === null) return a.name.localeCompare(b.name);
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av || a.name.localeCompare(b.name);
  });

  return rows.slice(0, limit);
}

export function getAllRelicPartUrlNames(): string[] {
  return [
    ...new Set(
      RELIC_CATALOG.flatMap((relic) =>
        relic.drops.map((drop) => drop.urlName).filter((url): url is string => Boolean(url)),
      ),
    ),
  ];
}

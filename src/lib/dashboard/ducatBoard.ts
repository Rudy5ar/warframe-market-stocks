import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { getLiveDucatFeed } from "@/lib/wfm/live";

import {
  DUCAT_CATALOG,
  ducatsPerPlat,
  platPerDucat,
  recommendDucatAction,
} from "./ducats";
import type { DucatBoardRow, DucatSort } from "./types";

export type { DucatBoardRow, DucatSort };

async function loadAllItemMetaById(): Promise<
  Map<string, { urlName: string; itemName: string; thumb: string | null }>
> {
  const supabase = createServiceClient();
  const map = new Map<string, { urlName: string; itemName: string; thumb: string | null }>();
  const PAGE = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("items")
      .select("id, url_name, item_name, thumb")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`getDucatBoard: ${error.message}`);
    for (const row of data ?? []) {
      map.set(row.id, {
        urlName: row.url_name,
        itemName: row.item_name,
        thumb: row.thumb,
      });
    }
    if (!data || data.length < PAGE) break;
    offset += PAGE;
  }

  return map;
}

function sortDucatRows(rows: DucatBoardRow[], sort: DucatSort): void {
  if (sort === "highest_plat") {
    rows.sort(
      (a, b) => (b.lowestSell ?? -1) - (a.lowestSell ?? -1) || a.itemName.localeCompare(b.itemName),
    );
  } else if (sort === "sell_plat") {
    rows.sort((a, b) => {
      if (a.ducatsPerPlat === null && b.ducatsPerPlat === null) {
        return a.itemName.localeCompare(b.itemName);
      }
      if (a.ducatsPerPlat === null) return 1;
      if (b.ducatsPerPlat === null) return -1;
      return a.ducatsPerPlat - b.ducatsPerPlat || (b.lowestSell ?? 0) - (a.lowestSell ?? 0);
    });
  } else {
    rows.sort((a, b) => {
      if (a.ducatsPerPlat === null && b.ducatsPerPlat === null) {
        return a.itemName.localeCompare(b.itemName);
      }
      if (a.ducatsPerPlat === null) return 1;
      if (b.ducatsPerPlat === null) return -1;
      return b.ducatsPerPlat - a.ducatsPerPlat || b.ducats - a.ducats;
    });
  }
}

export async function getDucatBoard(
  sort: DucatSort = "ducats_per_plat",
  limit = 150,
  tier: number | null = null,
): Promise<DucatBoardRow[]> {
  const [liveFeed, itemsById] = await Promise.all([getLiveDucatFeed(), loadAllItemMetaById()]);

  // Primary path: 1-call live WFM /v1/tools/ducats feed (all ~757 Prime items, cached 15m).
  if (liveFeed.size > 0) {
    const rows: DucatBoardRow[] = [];
    for (const entry of liveFeed.values()) {
      if (tier !== null && entry.ducats !== tier) continue;
      const meta = itemsById.get(entry.itemId);
      if (!meta) continue;
      const price = entry.median > 0 ? Math.round(entry.median * 10) / 10 : null;
      const dpp = entry.ducatsPerPlat > 0 ? entry.ducatsPerPlat : ducatsPerPlat(price, entry.ducats);
      rows.push({
        urlName: meta.urlName,
        itemName: meta.itemName,
        thumb: meta.thumb,
        ducats: entry.ducats,
        lowestSell: price !== null ? Math.round(price) : null,
        volume48h: entry.volume,
        scannedAt: entry.datetime,
        platPerDucat: platPerDucat(price, entry.ducats),
        ducatsPerPlat: dpp,
        recommendation: recommendDucatAction(price, entry.ducats),
      });
    }
    sortDucatRows(rows, sort);
    return rows.slice(0, limit);
  }

  // Fallback path: local DB snapshots if WFM /tools/ducats is temporarily unreachable.
  const supabase = createServiceClient();
  const entries =
    tier !== null ? DUCAT_CATALOG.filter((entry) => entry.ducats === tier) : DUCAT_CATALOG;
  const urlNames = entries.map((entry) => entry.urlName);

  const itemsByUrl = new Map<string, { itemName: string; thumb: string | null }>();
  for (const meta of itemsById.values()) {
    itemsByUrl.set(meta.urlName, { itemName: meta.itemName, thumb: meta.thumb });
  }

  const snapshotsByUrl = new Map<
    string,
    { lowest_sell: number | null; volume_48h: number | null; scanned_at: string }
  >();
  const CHUNK = 200;
  for (let i = 0; i < urlNames.length; i += CHUNK) {
    const chunk = urlNames.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("item_snapshots")
      .select("url_name, lowest_sell, volume_48h, scanned_at")
      .in("url_name", chunk);
    if (error) throw new Error(`getDucatBoard: ${error.message}`);
    for (const row of data ?? []) {
      snapshotsByUrl.set(row.url_name, row);
    }
  }

  const rows: DucatBoardRow[] = entries.map((entry) => {
    const item = itemsByUrl.get(entry.urlName);
    const snapshot = snapshotsByUrl.get(entry.urlName);
    const lowestSell = snapshot?.lowest_sell ?? null;
    return {
      urlName: entry.urlName,
      itemName: item?.itemName ?? entry.urlName,
      thumb: item?.thumb ?? null,
      ducats: entry.ducats,
      lowestSell,
      volume48h: snapshot?.volume_48h ?? null,
      scannedAt: snapshot?.scanned_at ?? null,
      platPerDucat: platPerDucat(lowestSell, entry.ducats),
      ducatsPerPlat: ducatsPerPlat(lowestSell, entry.ducats),
      recommendation: recommendDucatAction(lowestSell, entry.ducats),
    };
  });

  sortDucatRows(rows, sort);
  return rows.slice(0, limit);
}

export function getAllDucatUrlNames(): string[] {
  return DUCAT_CATALOG.map((entry) => entry.urlName);
}

import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

import {
  DUCAT_CATALOG,
  DEFAULT_MIN_PLAT_PER_DUCAT,
  platPerDucat,
  recommendDucatAction,
} from "./ducats";
import type { DucatBoardRow, DucatSort } from "./types";

export type { DucatBoardRow, DucatSort };

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Prime parts ranked for sell-on-market vs junk-for-ducats. */
export async function getDucatBoard(
  sort: DucatSort = "plat_per_ducat",
  limit = 80,
): Promise<DucatBoardRow[]> {
  const supabase = createServiceClient();
  const minRatio = envFloat("MIN_PLAT_PER_DUCAT", DEFAULT_MIN_PLAT_PER_DUCAT);
  const urlNames = DUCAT_CATALOG.map((entry) => entry.urlName);

  const itemsByUrl = new Map<string, { itemName: string; thumb: string | null }>();
  const CHUNK = 200;
  for (let i = 0; i < urlNames.length; i += CHUNK) {
    const chunk = urlNames.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("items")
      .select("url_name, item_name, thumb")
      .in("url_name", chunk);
    if (error) throw new Error(`getDucatBoard: ${error.message}`);
    for (const row of data ?? []) {
      itemsByUrl.set(row.url_name, { itemName: row.item_name, thumb: row.thumb });
    }
  }

  const snapshotsByUrl = new Map<
    string,
    { lowest_sell: number | null; volume_48h: number | null; scanned_at: string }
  >();
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

  const rows: DucatBoardRow[] = DUCAT_CATALOG.map((entry) => {
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
      recommendation: recommendDucatAction(lowestSell, entry.ducats, minRatio),
    };
  });

  if (sort === "sell") {
    rows.sort(
      (a, b) => (b.lowestSell ?? -1) - (a.lowestSell ?? -1) || a.itemName.localeCompare(b.itemName),
    );
  } else {
    // Lowest plat/ducat first among priced rows (junk candidates), unscanned last
    rows.sort((a, b) => {
      if (a.platPerDucat === null && b.platPerDucat === null) {
        return a.itemName.localeCompare(b.itemName);
      }
      if (a.platPerDucat === null) return 1;
      if (b.platPerDucat === null) return -1;
      return a.platPerDucat - b.platPerDucat || a.itemName.localeCompare(b.itemName);
    });
  }

  return rows.slice(0, limit);
}

export function getAllDucatUrlNames(): string[] {
  return DUCAT_CATALOG.map((entry) => entry.urlName);
}

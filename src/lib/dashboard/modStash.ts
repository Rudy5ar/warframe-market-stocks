import "server-only";

import {
  DEFAULT_MIN_MOD_SELL_PLAT,
  endoForRarity,
  rarityFromTags,
  recommendModAction,
} from "@/lib/market";
import { createServiceClient } from "@/lib/supabase/server";

import { isFodderMod } from "./fodderMods";
import type { MarketableModRow, ModStashRow } from "./types";


function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

const ITEMS_PAGE_SIZE = 1000;

async function fetchItemsMeta(
  supabase: ReturnType<typeof createServiceClient>,
  urlNames: string[],
): Promise<Map<string, { itemName: string; thumb: string | null; tags: string[] }>> {
  const map = new Map<string, { itemName: string; thumb: string | null; tags: string[] }>();
  if (urlNames.length === 0) return map;

  const { data, error } = await supabase
    .from("items")
    .select("url_name, item_name, thumb, tags")
    .in("url_name", urlNames);

  if (error) {
    throw new Error(`Failed to load items for mod stash: ${error.message}`);
  }

  for (const row of data ?? []) {
    map.set(row.url_name, {
      itemName: row.item_name,
      thumb: row.thumb,
      tags: row.tags ?? [],
    });
  }
  return map;
}

/** Personal mod stash with list-vs-dissolve recommendations. */
export async function getModStash(): Promise<ModStashRow[]> {
  const supabase = createServiceClient();
  const minSell = envFloat("MIN_MOD_SELL_PLAT", DEFAULT_MIN_MOD_SELL_PLAT);

  const { data: pins, error: pinsError } = await supabase
    .from("mod_stash")
    .select("url_name, quantity, created_at")
    .order("created_at", { ascending: false });

  if (pinsError) {
    throw new Error(`getModStash: ${pinsError.message}`);
  }

  const rows = pins ?? [];
  const urlNames = rows.map((row) => row.url_name);
  const itemsByUrlName = await fetchItemsMeta(supabase, urlNames);

  const { data: snapshots, error: snapshotsError } =
    urlNames.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("item_snapshots")
          .select("url_name, lowest_sell, volume_48h, scanned_at")
          .in("url_name", urlNames);

  if (snapshotsError) {
    throw new Error(`getModStash: ${snapshotsError.message}`);
  }

  const snapshotsByUrlName = new Map((snapshots ?? []).map((row) => [row.url_name, row]));

  return rows
    .map((row) => {
      const item = itemsByUrlName.get(row.url_name);
      const snapshot = snapshotsByUrlName.get(row.url_name);
      const rarity = rarityFromTags(item?.tags);
      const lowestSell = snapshot?.lowest_sell ?? null;
      return {
        urlName: row.url_name,
        itemName: item?.itemName ?? null,
        thumb: item?.thumb ?? null,
        quantity: row.quantity,
        pinnedAt: row.created_at,
        isOrphan: !item,
        lowestSell,
        volume48h: snapshot?.volume_48h ?? null,
        scannedAt: snapshot?.scanned_at ?? null,
        rarity,
        endo: endoForRarity(rarity),
        recommendation: recommendModAction(lowestSell, minSell),
      };
    })
    .sort((a, b) => {
      const rank = (rec: string) => (rec === "list" ? 0 : rec === "unknown" ? 1 : 2);
      return (
        rank(a.recommendation) - rank(b.recommendation) ||
        (b.lowestSell ?? -1) - (a.lowestSell ?? -1)
      );
    });
}

/**
 * Casual “fodder” rares (vault / nightmare / loot / bounty sets) ranked by
 * current sell price — which piles of junk are actually worth listing.
 */
export async function getMarketableMods(limit = 50): Promise<MarketableModRow[]> {
  const supabase = createServiceClient();
  const minSell = envFloat("MIN_MOD_SELL_PLAT", DEFAULT_MIN_MOD_SELL_PLAT);

  const candidates: {
    urlName: string;
    itemName: string;
    thumb: string | null;
    tags: string[];
  }[] = [];

  let pageOffset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("items")
      .select("url_name, item_name, thumb, tags")
      .order("url_name", { ascending: true })
      .range(pageOffset, pageOffset + ITEMS_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`getMarketableMods: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (!isFodderMod(row.item_name)) continue;
      candidates.push({
        urlName: row.url_name,
        itemName: row.item_name,
        thumb: row.thumb,
        tags: row.tags ?? [],
      });
    }

    if (!data || data.length < ITEMS_PAGE_SIZE) break;
    pageOffset += ITEMS_PAGE_SIZE;
  }

  const urlNames = candidates.map((row) => row.urlName);
  const snapshotsByUrlName = new Map<
    string,
    { lowest_sell: number | null; volume_48h: number | null; scanned_at: string }
  >();

  const CHUNK = 200;
  for (let i = 0; i < urlNames.length; i += CHUNK) {
    const chunk = urlNames.slice(i, i + CHUNK);
    if (chunk.length === 0) continue;
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("item_snapshots")
      .select("url_name, lowest_sell, volume_48h, scanned_at")
      .in("url_name", chunk);
    if (snapshotsError) {
      throw new Error(`getMarketableMods: ${snapshotsError.message}`);
    }
    for (const row of snapshots ?? []) {
      snapshotsByUrlName.set(row.url_name, row);
    }
  }

  return candidates
    .map((row) => {
      const snapshot = snapshotsByUrlName.get(row.urlName);
      const rarity = rarityFromTags(row.tags);
      const lowestSell = snapshot?.lowest_sell ?? null;
      return {
        urlName: row.urlName,
        itemName: row.itemName,
        thumb: row.thumb,
        lowestSell,
        volume48h: snapshot?.volume_48h ?? null,
        scannedAt: snapshot?.scanned_at ?? null,
        rarity,
        endo: endoForRarity(rarity),
        recommendation: recommendModAction(lowestSell, minSell),
      };
    })
    .sort(
      (a, b) =>
        (b.lowestSell ?? -1) - (a.lowestSell ?? -1) || a.itemName.localeCompare(b.itemName),
    )
    .slice(0, limit);
}

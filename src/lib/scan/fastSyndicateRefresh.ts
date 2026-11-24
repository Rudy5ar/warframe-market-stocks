import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { findSyndicateMod, SYNDICATES, syndicateSlug } from "@/lib/dashboard/syndicates";
import type { Database } from "@/lib/supabase/database.types";
import { wfmRateLimiter } from "@/lib/wfm/rateLimiter";

const WFM_V2_BASE = "https://api.warframe.market/v2";
const FETCH_TIMEOUT_MS = 10_000;
const WORKER_CONCURRENCY = 3;

interface RawTopOrder {
  type?: string;
  platinum?: number;
  perTrade?: number;
  rank?: number;
  subtype?: string;
  visible?: boolean;
  user?: {
    status?: string;
  };
}

interface RawTopResponse {
  data?: {
    sell?: RawTopOrder[];
    buy?: RawTopOrder[];
  };
}

export interface FastRefreshedItem {
  urlName: string;
  lowestSell: number | null;
  highestBuy: number | null;
  spread: number | null;
  roiPct: number | null;
  scannedAt: string;
}

export interface FastRefreshSummary {
  items: FastRefreshedItem[];
  failed: string[];
  durationMs: number;
}

function wfmHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    Platform: "pc",
    Language: "en",
    "User-Agent":
      process.env.WFM_USER_AGENT?.trim() || "tenno-desk/0.1 (warframe.market companion)",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeTopMetrics(payload: RawTopResponse): {
  lowestSell: number | null;
  highestBuy: number | null;
  spread: number | null;
  roiPct: number | null;
} {
  const toActionable = (orders: RawTopOrder[] | undefined) =>
    (orders ?? [])
      .filter(
        (order) =>
          order &&
          order.visible !== false &&
          typeof order.platinum === "number" &&
          order.user?.status === "ingame",
      )
      .map((order) => ({
        unit: Math.round((order.platinum as number) / Math.max(order.perTrade ?? 1, 1)),
        variant: `${order.rank ?? ""}|${order.subtype ?? ""}`,
      }));

  const sells = toActionable(payload.data?.sell).sort((a, b) => a.unit - b.unit);
  const buys = toActionable(payload.data?.buy);

  const cheapest = sells[0] ?? null;
  const sameVariantSells = cheapest
    ? sells.filter((entry) => entry.variant === cheapest.variant)
    : sells;
  const sameVariantBuys = cheapest
    ? buys.filter((entry) => entry.variant === cheapest.variant)
    : buys;

  const lowestSell = sameVariantSells[0]?.unit ?? null;
  const nextSell = sameVariantSells.length >= 2 ? sameVariantSells[1].unit : null;
  const highestBuy =
    sameVariantBuys.length > 0 ? Math.max(...sameVariantBuys.map((entry) => entry.unit)) : null;

  if (lowestSell === null || nextSell === null) {
    return { lowestSell, highestBuy, spread: null, roiPct: null };
  }

  const spread = nextSell - lowestSell;
  const roiPct = lowestSell > 0 ? (spread / lowestSell) * 100 : null;
  return { lowestSell, highestBuy, spread, roiPct };
}

async function fetchOneTopFresh(urlName: string): Promise<FastRefreshedItem> {
  const url = `${WFM_V2_BASE}/orders/item/${encodeURIComponent(urlName)}/top`;
  const headers = wfmHeaders();

  for (let attempt = 0; attempt <= 2; attempt++) {
    await wfmRateLimiter.acquire();
    const res = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (res.status === 429 && attempt < 2) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const delayMs =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * (attempt + 1);
      await sleep(delayMs);
      continue;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = (await res.json()) as RawTopResponse;
    const metrics = computeTopMetrics(json);
    return {
      urlName,
      ...metrics,
      scannedAt: new Date().toISOString(),
    };
  }

  throw new Error("Rate limited");
}

export async function fastRefreshTopOrders(
  supabase: SupabaseClient<Database>,
  urlNames: string[],
  options?: { timeBudgetMs?: number },
): Promise<FastRefreshSummary> {
  const startedAt = Date.now();
  const unique = [...new Set(urlNames)];
  if (unique.length === 0) {
    return { items: [], failed: [], durationMs: 0 };
  }

  const timeBudgetMs = options?.timeBudgetMs ?? 45_000;
  const items: FastRefreshedItem[] = [];
  const failed: string[] = [];

  let cursor = 0;
  async function worker() {
    while (cursor < unique.length) {
      if (Date.now() - startedAt >= timeBudgetMs) return;
      const index = cursor;
      cursor += 1;
      const urlName = unique[index];
      try {
        const result = await fetchOneTopFresh(urlName);
        items.push(result);
      } catch (err) {
        failed.push(`${urlName}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  const workerCount = Math.min(WORKER_CONCURRENCY, unique.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (items.length > 0) {
    const refreshedUrls = items.map((entry) => entry.urlName);
    const { data: existingSnaps } = await supabase
      .from("item_snapshots")
      .select("url_name, median_48h, volume_48h")
      .in("url_name", refreshedUrls);

    const existingByUrl = new Map(
      (existingSnaps ?? []).map((row) => [
        row.url_name,
        { median48h: row.median_48h, volume48h: row.volume_48h },
      ]),
    );

    const upsertRows = items.map((entry) => {
      const existing = existingByUrl.get(entry.urlName);
      return {
        url_name: entry.urlName,
        lowest_sell: entry.lowestSell,
        highest_buy: entry.highestBuy,
        spread: entry.spread,
        roi_pct: entry.roiPct,
        median_48h: existing?.median48h ?? null,
        volume_48h: existing?.volume48h ?? null,
        scanned_at: entry.scannedAt,
      };
    });

    const { error: upsertError } = await supabase
      .from("item_snapshots")
      .upsert(upsertRows, { onConflict: "url_name" });

    if (upsertError) {
      throw new Error(`Failed to persist refreshed snapshots: ${upsertError.message}`);
    }
  }

  return {
    items,
    failed,
    durationMs: Date.now() - startedAt,
  };
}

export interface CatalogSyndicateItem {
  urlName: string;
  itemName: string;
  syndicateIndices: number[];
}

export async function loadSyndicateCatalogItems(
  supabase: SupabaseClient<Database>,
): Promise<CatalogSyndicateItem[]> {
  const matched: CatalogSyndicateItem[] = [];
  const PAGE = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("items")
      .select("url_name, item_name")
      .order("url_name", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      throw new Error(`Failed to read catalog items: ${error.message}`);
    }

    for (const row of data ?? []) {
      const entry = findSyndicateMod(row.item_name);
      if (entry) {
        matched.push({
          urlName: row.url_name,
          itemName: row.item_name,
          syndicateIndices: entry.syndicates,
        });
      }
    }

    if (!data || data.length < PAGE) break;
    offset += PAGE;
  }

  return matched;
}

export function resolveSyndicateIndex(input: string): { index: number; name: string } | null {
  const normalized = input.trim().toLowerCase();
  for (let i = 0; i < SYNDICATES.length; i++) {
    const name = SYNDICATES[i];
    if (name.toLowerCase() === normalized || syndicateSlug(name) === normalized) {
      return { index: i, name };
    }
  }
  return null;
}

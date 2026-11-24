import "server-only";

import { DEFAULT_SPREAD_THRESHOLDS } from "@/lib/market";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { buildWfmWhisper, getLiveDucatFeed, getLiveRecentOrders } from "@/lib/wfm/live";

import { SYNDICATES, findSyndicateMod } from "./syndicates";
import type { SyndicateModEntry } from "./syndicates";
import type {
  AlertRow,
  CatalogHit,
  DealMode,
  DealRow,
  HistoryPoint,
  ItemDetail,
  OpportunityRow,
  ScanStatusSummary,
  SyndicateAugmentRow,
  SyndicateSection,
  WatchlistRow,
} from "./types";

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function opportunityThresholds() {
  return {
    minSpread: envFloat("MIN_SPREAD", DEFAULT_SPREAD_THRESHOLDS.minSpread),
    minRoiPct: envFloat("MIN_ROI_PCT", DEFAULT_SPREAD_THRESHOLDS.minRoiPct),
  };
}

async function fetchItemNamesByUrlName(
  supabase: ReturnType<typeof createServiceClient>,
  urlNames: string[],
): Promise<Map<string, { itemName: string; thumb: string | null }>> {
  const map = new Map<string, { itemName: string; thumb: string | null }>();
  if (urlNames.length === 0) return map;

  const { data, error } = await supabase
    .from("items")
    .select("url_name, item_name, thumb")
    .in("url_name", urlNames);

  if (error) {
    throw new Error(`Failed to load items for lookup: ${error.message}`);
  }

  for (const row of data ?? []) {
    map.set(row.url_name, { itemName: row.item_name, thumb: row.thumb });
  }

  return map;
}

export async function getTopOpportunities(
  limit = 20,
  sort: "roi" | "spread" = "roi",
): Promise<OpportunityRow[]> {
  const supabase = createServiceClient();
  const orderColumn = sort === "spread" ? "spread" : "roi_pct";
  const { minSpread, minRoiPct } = opportunityThresholds();

  const { data, error } = await supabase
    .from("item_snapshots")
    .select("url_name, lowest_sell, highest_buy, spread, roi_pct, volume_48h, scanned_at")
    .gte("spread", minSpread)
    .gte("roi_pct", minRoiPct)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`getTopOpportunities: ${error.message}`);
  }

  const rows = data ?? [];
  const itemsByUrlName = await fetchItemNamesByUrlName(
    supabase,
    rows.map((row) => row.url_name),
  );

  return rows.map((row) => ({
    urlName: row.url_name,
    itemName: itemsByUrlName.get(row.url_name)?.itemName ?? row.url_name,
    thumb: itemsByUrlName.get(row.url_name)?.thumb ?? null,
    lowestSell: row.lowest_sell,
    highestBuy: row.highest_buy,
    spread: row.spread,
    roiPct: row.roi_pct,
    volume48h: row.volume_48h,
    scannedAt: row.scanned_at,
  }));
}

export async function getRecentAlerts(limit = 20): Promise<AlertRow[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("alerts")
    .select("id, type, url_name, payload, alert_day, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`getRecentAlerts: ${error.message}`);
  }

  const rows = data ?? [];
  const itemsByUrlName = await fetchItemNamesByUrlName(
    supabase,
    rows.map((row) => row.url_name),
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    urlName: row.url_name,
    itemName: itemsByUrlName.get(row.url_name)?.itemName ?? row.url_name,
    thumb: itemsByUrlName.get(row.url_name)?.thumb ?? null,
    payload: (row.payload ?? {}) as Record<string, number | null>,
    alertDay: row.alert_day,
    createdAt: row.created_at,
  }));
}

export async function getWatchlist(): Promise<WatchlistRow[]> {
  const userClient = await createUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return [];

  const { data: pins, error: pinsError } = await userClient
    .from("watchlist")
    .select("url_name, created_at")
    .order("created_at", { ascending: false });

  if (pinsError) {
    throw new Error(`getWatchlist: ${pinsError.message}`);
  }

  const rows = pins ?? [];
  const urlNames = rows.map((row) => row.url_name);
  const catalog = createServiceClient();

  const itemsByUrlName = await fetchItemNamesByUrlName(catalog, urlNames);

  const { data: snapshots, error: snapshotsError } =
    urlNames.length === 0
      ? { data: [], error: null }
      : await catalog
          .from("item_snapshots")
          .select("url_name, lowest_sell, spread, roi_pct, scanned_at")
          .in("url_name", urlNames);

  if (snapshotsError) {
    throw new Error(`getWatchlist: ${snapshotsError.message}`);
  }

  const snapshotsByUrlName = new Map((snapshots ?? []).map((row) => [row.url_name, row]));

  return rows.map((row) => {
    const item = itemsByUrlName.get(row.url_name);
    const snapshot = snapshotsByUrlName.get(row.url_name);
    return {
      urlName: row.url_name,
      itemName: item?.itemName ?? null,
      thumb: item?.thumb ?? null,
      pinnedAt: row.created_at,
      isOrphan: !item,
      lowestSell: snapshot?.lowest_sell ?? null,
      spread: snapshot?.spread ?? null,
      roiPct: snapshot?.roi_pct ?? null,
      scannedAt: snapshot?.scanned_at ?? null,
    };
  });
}

export async function getScanStatus(): Promise<ScanStatusSummary> {
  const supabase = createServiceClient();

  const { data: cursor, error: cursorError } = await supabase
    .from("scan_cursor")
    .select("status, offset, last_run_at")
    .eq("id", 1)
    .single();

  if (cursorError || !cursor) {
    throw new Error(`getScanStatus: ${cursorError?.message ?? "scan_cursor row missing"}`);
  }

  const todayUtc = new Date().toISOString().slice(0, 10);
  const userClient = await createUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const [totalItems, scannedItems, watchlistCount, alertsToday] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase.from("item_snapshots").select("url_name", { count: "exact", head: true }),
    user
      ? userClient.from("watchlist").select("url_name", { count: "exact", head: true })
      : Promise.resolve({ count: null, error: null }),
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("alert_day", todayUtc),
  ]);

  for (const result of [totalItems, scannedItems, watchlistCount, alertsToday]) {
    if (result.error) {
      throw new Error(`getScanStatus: ${result.error.message}`);
    }
  }

  return {
    status: cursor.status,
    offset: cursor.offset,
    lastRunAt: cursor.last_run_at,
    totalItems: totalItems.count ?? 0,
    scannedItems: scannedItems.count ?? 0,
    watchlistCount: user ? (watchlistCount.count ?? 0) : null,
    alertsToday: alertsToday.count ?? 0,
  };
}

const ITEMS_PAGE_SIZE = 1000;

interface MatchedSyndicateMod {
  urlName: string;
  itemName: string;
  thumb: string | null;
  entry: SyndicateModEntry;
}

export async function getSyndicateAugments(): Promise<SyndicateSection[]> {
  const supabase = createServiceClient();

  const matched: MatchedSyndicateMod[] = [];
  let pageOffset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("items")
      .select("url_name, item_name, thumb")
      .order("url_name", { ascending: true })
      .range(pageOffset, pageOffset + ITEMS_PAGE_SIZE - 1);
    if (error) {
      throw new Error(`getSyndicateAugments: ${error.message}`);
    }
    for (const item of data ?? []) {
      const entry = findSyndicateMod(item.item_name);
      if (entry) {
        matched.push({
          urlName: item.url_name,
          itemName: item.item_name,
          thumb: item.thumb,
          entry,
        });
      }
    }
    if (!data || data.length < ITEMS_PAGE_SIZE) break;
    pageOffset += ITEMS_PAGE_SIZE;
  }

  const urlNames = matched.map((mod) => mod.urlName);
  const { data: snapshots, error: snapshotsError } =
    urlNames.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("item_snapshots")
          .select("url_name, lowest_sell, highest_buy, spread, roi_pct, scanned_at")
          .in("url_name", urlNames);
  if (snapshotsError) {
    throw new Error(`getSyndicateAugments: ${snapshotsError.message}`);
  }

  const snapshotsByUrlName = new Map((snapshots ?? []).map((row) => [row.url_name, row]));

  return SYNDICATES.map((syndicate, syndicateIndex) => {
    const mods: SyndicateAugmentRow[] = matched
      .filter((mod) => mod.entry.syndicates.includes(syndicateIndex))
      .map((mod) => {
        const snapshot = snapshotsByUrlName.get(mod.urlName);
        return {
          urlName: mod.urlName,
          itemName: mod.itemName,
          compat: mod.entry.compat,
          thumb: mod.thumb,
          lowestSell: snapshot?.lowest_sell ?? null,
          highestBuy: snapshot?.highest_buy ?? null,
          spread: snapshot?.spread ?? null,
          roiPct: snapshot?.roi_pct ?? null,
          scannedAt: snapshot?.scanned_at ?? null,
        };
      })
      .sort(
        (a, b) =>
          (b.lowestSell ?? -1) - (a.lowestSell ?? -1) || a.itemName.localeCompare(b.itemName),
      );

    return {
      syndicate,
      mods,
      unscanned: mods.every((mod) => mod.scannedAt === null),
    };
  });
}

export async function getItemDetail(urlName: string): Promise<ItemDetail | null> {
  const supabase = createServiceClient();
  const normalized = urlName.trim().toLowerCase();
  if (!normalized) return null;

  const [itemResult, snapshotResult, historyResult, watchlistResult, alertsResult] =
    await Promise.all([
      supabase
        .from("items")
        .select("url_name, item_name, thumb")
        .eq("url_name", normalized)
        .maybeSingle(),
      supabase
        .from("item_snapshots")
        .select("lowest_sell, highest_buy, spread, roi_pct, median_48h, volume_48h, scanned_at")
        .eq("url_name", normalized)
        .maybeSingle(),
      supabase
        .from("item_snapshot_history")
        .select("scanned_at, lowest_sell, highest_buy, spread, roi_pct, median_48h, volume_48h")
        .eq("url_name", normalized)
        .order("scanned_at", { ascending: false })
        .limit(50),
      createUserClient().then((userClient) =>
        userClient.from("watchlist").select("url_name").eq("url_name", normalized).maybeSingle(),
      ),
      supabase
        .from("alerts")
        .select("id, type, url_name, payload, alert_day, created_at")
        .eq("url_name", normalized)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (itemResult.error) throw new Error(`getItemDetail: ${itemResult.error.message}`);
  if (snapshotResult.error) throw new Error(`getItemDetail: ${snapshotResult.error.message}`);
  if (historyResult.error) throw new Error(`getItemDetail: ${historyResult.error.message}`);
  if (alertsResult.error) throw new Error(`getItemDetail: ${alertsResult.error.message}`);

  const item = itemResult.data;
  const snapshot = snapshotResult.data;

  if (!item && !snapshot && !watchlistResult.data) {
    return null;
  }

  const itemName = item?.item_name ?? normalized;
  const history: HistoryPoint[] = (historyResult.data ?? []).map((row) => ({
    scannedAt: row.scanned_at,
    lowestSell: row.lowest_sell,
    highestBuy: row.highest_buy,
    spread: row.spread,
    roiPct: row.roi_pct,
    median48h: row.median_48h,
    volume48h: row.volume_48h,
  }));

  const alerts: AlertRow[] = (alertsResult.data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    urlName: row.url_name,
    itemName,
    thumb: item?.thumb ?? null,
    payload: (row.payload ?? {}) as Record<string, number | null>,
    alertDay: row.alert_day,
    createdAt: row.created_at,
  }));

  return {
    urlName: normalized,
    itemName,
    thumb: item?.thumb ?? null,
    exists: Boolean(item),
    isWatchlisted: Boolean(watchlistResult.data),
    lowestSell: snapshot?.lowest_sell ?? null,
    highestBuy: snapshot?.highest_buy ?? null,
    spread: snapshot?.spread ?? null,
    roiPct: snapshot?.roi_pct ?? null,
    median48h: snapshot?.median_48h ?? null,
    volume48h: snapshot?.volume_48h ?? null,
    scannedAt: snapshot?.scanned_at ?? null,
    history,
    alerts,
  };
}

export async function getScanPulse(): Promise<{
  status: ScanStatusSummary["status"];
  lastRunAt: string | null;
}> {
  const supabase = createServiceClient();
  const { data: cursor, error } = await supabase
    .from("scan_cursor")
    .select("status, last_run_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !cursor) {
    return { status: "idle", lastRunAt: null };
  }

  return { status: cursor.status, lastRunAt: cursor.last_run_at };
}

export function sanitizeCatalogQuery(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 80);
}

export async function searchCatalog(query: string, limit = 8): Promise<CatalogHit[]> {
  const safe = sanitizeCatalogQuery(query);
  if (safe.length < 2) return [];

  const supabase = createServiceClient();
  const fuzzy = `%${safe.replace(/\s+/g, "%")}%`;
  const slug = `%${safe.toLowerCase().replace(/\s+/g, "_")}%`;

  const { data, error } = await supabase
    .from("items")
    .select("url_name, item_name, thumb")
    .or(`item_name.ilike."${fuzzy}",url_name.ilike."${slug}"`)
    .order("item_name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`searchCatalog: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    urlName: row.url_name,
    itemName: row.item_name,
    thumb: row.thumb,
  }));
}

export async function fetchSparklines(urlNames: string[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  if (urlNames.length === 0) return map;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("item_snapshot_history")
    .select("url_name, lowest_sell, scanned_at")
    .in("url_name", urlNames)
    .order("scanned_at", { ascending: true });

  if (error) {
    return map;
  }

  for (const row of data ?? []) {
    if (row.lowest_sell === null) continue;
    const list = map.get(row.url_name);
    if (list) {
      list.push(row.lowest_sell);
    } else {
      map.set(row.url_name, [row.lowest_sell]);
    }
  }
  return map;
}

export async function getLiveRecentDeals(limit = 40, minVolume = 5): Promise<DealRow[]> {
  const [recentOrders, ducatFeed] = await Promise.all([
    getLiveRecentOrders(),
    getLiveDucatFeed(),
  ]);

  const ingameSells = recentOrders.filter(
    (order) => order.type === "sell" && order.user.status === "ingame" && order.platinum >= 3,
  );
  if (ingameSells.length === 0) return [];

  const itemIds = [...new Set(ingameSells.map((order) => order.itemId))];
  const supabase = createServiceClient();

  const { data: itemRows, error: itemsError } = await supabase
    .from("items")
    .select("id, url_name, item_name, thumb")
    .in("id", itemIds);
  if (itemsError) return [];

  const itemById = new Map(
    (itemRows ?? []).map((row) => [
      row.id,
      { urlName: row.url_name, itemName: row.item_name, thumb: row.thumb },
    ]),
  );

  const urlNames = [...new Set((itemRows ?? []).map((row) => row.url_name))];
  const { data: snapRows } =
    urlNames.length > 0
      ? await supabase
          .from("item_snapshots")
          .select("url_name, median_48h, volume_48h, spread, roi_pct")
          .in("url_name", urlNames)
      : { data: [] };

  const snapByUrl = new Map((snapRows ?? []).map((row) => [row.url_name, row]));

  const bestByUrl = new Map<string, { deal: DealRow; score: number }>();

  for (const order of ingameSells) {
    const item = itemById.get(order.itemId);
    if (!item) continue;

    const unitPrice = Math.round(order.platinum / order.perTrade);
    if (unitPrice < 3) continue;

    const ducat = ducatFeed.get(order.itemId);
    const snap = snapByUrl.get(item.urlName);

    const baseline =
      ducat && ducat.median > 0
        ? ducat.median
        : snap?.median_48h && snap.median_48h > 0
          ? snap.median_48h
          : null;
    const volume = Math.max(ducat?.volume ?? 0, snap?.volume_48h ?? 0);

    if (baseline === null || baseline < 5 || volume < minVolume) continue;

    const ratio = (unitPrice - baseline) / baseline;
    // Guard against rank-0 vs max-rank mismatches on arcanes & primed mods.
    if (ratio > -0.1 || ratio < -0.62 || baseline - unitPrice < 3) continue;

    const diffPlat = Math.round(unitPrice - baseline);
    const diffPct = Math.round(ratio * 100);
    const score = Math.abs(ratio) * Math.log10(volume + 3) * (1 + Math.min(30, baseline - unitPrice) / 35);

    const existing = bestByUrl.get(item.urlName);
    if (existing && existing.deal.lowestSell <= unitPrice) continue;

    bestByUrl.set(item.urlName, {
      score,
      deal: {
        urlName: item.urlName,
        itemName: item.itemName,
        thumb: item.thumb,
        lowestSell: unitPrice,
        median48h: baseline,
        diffPlat,
        diffPct,
        spread: snap?.spread ?? null,
        roiPct: snap?.roi_pct ?? null,
        volume48h: volume,
        scannedAt: order.createdAt,
        call: "grab",
        isLive: true,
        sellerName: order.user.ingameName,
        rank: order.rank,
        whisper: buildWfmWhisper(order.user.ingameName, item.itemName, unitPrice, order.rank),
      },
    });
  }

  return [...bestByUrl.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.deal);
}

export async function getMarketDeals(
  mode: DealMode = "live",
  limit = 60,
  minVolume = 5,
): Promise<DealRow[]> {
  if (mode === "live") {
    return getLiveRecentDeals(limit, minVolume);
  }

  const supabase = createServiceClient();

  if (mode === "spread") {
    const { minSpread, minRoiPct } = opportunityThresholds();
    const { data, error } = await supabase
      .from("item_snapshots")
      .select("url_name, lowest_sell, median_48h, spread, roi_pct, volume_48h, scanned_at")
      .gte("spread", minSpread)
      .gte("roi_pct", minRoiPct)
      .gte("volume_48h", minVolume)
      .not("lowest_sell", "is", null)
      .order("spread", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`getMarketDeals: ${error.message}`);
    const rows = data ?? [];
    const items = await fetchItemNamesByUrlName(
      supabase,
      rows.map((r) => r.url_name),
    );
    return rows.map((row) => {
      const lowest = row.lowest_sell ?? 0;
      const med = row.median_48h;
      const diffPlat = med !== null ? Math.round(lowest - med) : null;
      const diffPct = med !== null && med > 0 ? Math.round(((lowest - med) / med) * 100) : null;
      const meta = items.get(row.url_name);
      return {
        urlName: row.url_name,
        itemName: meta?.itemName ?? row.url_name,
        thumb: meta?.thumb ?? null,
        lowestSell: lowest,
        median48h: med,
        diffPlat,
        diffPct,
        spread: row.spread,
        roiPct: row.roi_pct,
        volume48h: row.volume_48h ?? 0,
        scannedAt: row.scanned_at,
        call: "flip",
      };
    });
  }

  const { data, error } = await supabase
    .from("item_snapshots")
    .select("url_name, lowest_sell, median_48h, spread, roi_pct, volume_48h, scanned_at")
    .gte("volume_48h", minVolume)
    .gte("lowest_sell", mode === "cheap" ? 3 : 10)
    .gte("median_48h", 5)
    .order("volume_48h", { ascending: false })
    .limit(500);

  if (error) throw new Error(`getMarketDeals: ${error.message}`);

  const scored: Array<{
    row: NonNullable<typeof data>[number];
    diffPlat: number;
    diffPct: number;
    score: number;
  }> = [];

  for (const row of data ?? []) {
    const lowest = row.lowest_sell;
    const med = row.median_48h;
    const vol = row.volume_48h ?? 0;
    if (lowest === null || med === null || med <= 0) continue;

    const diffPlat = Math.round(lowest - med);
    const ratio = (lowest - med) / med;
    const diffPct = Math.round(ratio * 100);

    if (mode === "cheap") {
      // Cap at -65% to exclude Rank-0 vs Max-Rank Arcane/Mod mismatches in 48h stats.
      if (ratio <= -0.12 && ratio >= -0.65 && med - lowest >= 3) {
        const discount = Math.abs(ratio);
        const score = discount * Math.log10(vol + 3) * (1 + Math.min(25, med - lowest) / 40);
        scored.push({ row, diffPlat, diffPct, score });
      }
    } else if (ratio >= 0.15 && ratio <= 1.5 && lowest - med >= 4) {
      const score = ratio * Math.log10(vol + 3) * (1 + Math.min(40, lowest - med) / 50);
      scored.push({ row, diffPlat, diffPct, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);
  const items = await fetchItemNamesByUrlName(
    supabase,
    top.map((entry) => entry.row.url_name),
  );

  return top.map(({ row, diffPlat, diffPct }) => {
    const meta = items.get(row.url_name);
    return {
      urlName: row.url_name,
      itemName: meta?.itemName ?? row.url_name,
      thumb: meta?.thumb ?? null,
      lowestSell: row.lowest_sell ?? 0,
      median48h: row.median_48h,
      diffPlat,
      diffPct,
      spread: row.spread,
      roiPct: row.roi_pct,
      volume48h: row.volume_48h ?? 0,
      scannedAt: row.scanned_at,
      call: mode === "cheap" ? "grab" : "spike",
    };
  });
}

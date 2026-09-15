import "server-only";

import { DEFAULT_SPREAD_THRESHOLDS } from "@/lib/market";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

import { SYNDICATES, findSyndicateMod } from "./syndicates";
import type { SyndicateModEntry } from "./syndicates";
import type {
  AlertRow,
  CatalogHit,
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

/**
 * Thin data-access layer for the dashboard UI. Queries are written as
 * separate lookups (snapshots/alerts/watchlist first, `items` second) rather
 * than relying on Supabase's embedded-resource typing, since `items` rows
 * for a given `url_name` are not guaranteed to exist yet (manifest sync lag,
 * watchlist orphans) and this keeps the null-handling explicit.
 */

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

/** Top flips ranked by ROI% or spread, filtered to scan-aligned spread/ROI thresholds. */
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

/** Most recent spread/price-drop alerts, newest first. */
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

/** All pinned watchlist items, most recently pinned first, with current snapshot metrics. */
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

/** Scan cursor state plus basic table counts for `/status`. */
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

  const [totalItems, scannedItems, watchlistCount, alertsToday] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase.from("item_snapshots").select("url_name", { count: "exact", head: true }),
    supabase.from("watchlist").select("url_name", { count: "exact", head: true }),
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
    watchlistCount: watchlistCount.count ?? 0,
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

/**
 * All syndicate augment mods grouped by syndicate, each group sorted by current
 * lowest sell descending (most platinum first). Prices come from scan snapshots
 * — mods the scan hasn't reached yet sort last with null metrics.
 *
 * Matches `items` rows against the curated syndicate mod catalog locally
 * (case-insensitive); the full item table is paged because PostgREST caps a
 * single response at 1000 rows and the catalog is ~3x that.
 */
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

/** Full detail for `/items/[urlName]`. Returns `null` if the item is unknown everywhere. */
export async function getItemDetail(urlName: string): Promise<ItemDetail | null> {
  const supabase = createServiceClient();
  // WFM url_names and watchlist pins are stored lowercase; normalize route params.
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

/** Header pulse: cursor only, so a missing row does not 500 the whole app. */
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

/** Catalog name / url_name search for the header and pin forms. */
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

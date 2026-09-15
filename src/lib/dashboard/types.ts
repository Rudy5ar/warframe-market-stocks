import type { AlertType, ScanStatus } from "@/lib/supabase/database.types";
import type { ModRarity, ModRecommendation } from "@/lib/market";

/** Catalog search hit for header / pin forms. */
export interface CatalogHit {
  urlName: string;
  itemName: string;
  thumb: string | null;
}

/** Row for the top-opportunities table (`/` and future ranking views). */
export interface OpportunityRow {
  urlName: string;
  itemName: string;
  thumb: string | null;
  lowestSell: number | null;
  highestBuy: number | null;
  spread: number | null;
  roiPct: number | null;
  volume48h: number | null;
  scannedAt: string;
}

/** Row for the alerts feed (`/` strip and `/alerts`). */
export interface AlertRow {
  id: number;
  type: AlertType;
  urlName: string;
  itemName: string;
  thumb: string | null;
  payload: Record<string, number | null>;
  alertDay: string;
  createdAt: string;
}

/** Row for `/watchlist`. `isOrphan` is true when the pin has no matching `items` row yet. */
export interface WatchlistRow {
  urlName: string;
  itemName: string | null;
  thumb: string | null;
  pinnedAt: string;
  isOrphan: boolean;
  lowestSell: number | null;
  spread: number | null;
  roiPct: number | null;
  scannedAt: string | null;
}

/** Row for `/mods` stash (list vs dissolve). */
export interface ModStashRow {
  urlName: string;
  itemName: string | null;
  thumb: string | null;
  quantity: number;
  pinnedAt: string;
  isOrphan: boolean;
  lowestSell: number | null;
  volume48h: number | null;
  scannedAt: string | null;
  rarity: ModRarity | null;
  endo: number | null;
  recommendation: ModRecommendation;
}

/** Discovery row: marketable rare/legendary mods not necessarily in the stash. */
export interface MarketableModRow {
  urlName: string;
  itemName: string;
  thumb: string | null;
  lowestSell: number | null;
  volume48h: number | null;
  scannedAt: string | null;
  rarity: ModRarity | null;
  endo: number | null;
  recommendation: ModRecommendation;
}

/** Summary for `/status`. */
export interface ScanStatusSummary {
  status: ScanStatus;
  offset: number;
  lastRunAt: string | null;
  totalItems: number;
  scannedItems: number;
  watchlistCount: number;
  alertsToday: number;
}

/** One row of `item_snapshot_history` for the item detail history table. */
export interface HistoryPoint {
  scannedAt: string;
  lowestSell: number | null;
  highestBuy: number | null;
  spread: number | null;
  roiPct: number | null;
  median48h: number | null;
  volume48h: number | null;
}

/** One augment row inside a syndicate section on `/syndicates`. */
export interface SyndicateAugmentRow {
  urlName: string;
  itemName: string;
  compat: string | null;
  thumb: string | null;
  lowestSell: number | null;
  highestBuy: number | null;
  spread: number | null;
  roiPct: number | null;
  scannedAt: string | null;
}

/** One syndicate's augment list, sorted by current sell price (most plat first). */
export interface SyndicateSection {
  syndicate: string;
  mods: SyndicateAugmentRow[];
  /** True when none of the mods have a snapshot yet (scan hasn't reached them). */
  unscanned: boolean;
}

/** Full detail payload for `/items/[urlName]`. */
export interface ItemDetail {
  urlName: string;
  itemName: string;
  thumb: string | null;
  exists: boolean;
  isWatchlisted: boolean;
  lowestSell: number | null;
  highestBuy: number | null;
  spread: number | null;
  roiPct: number | null;
  median48h: number | null;
  volume48h: number | null;
  scannedAt: string | null;
  history: HistoryPoint[];
  alerts: AlertRow[];
}

export type DucatSort = "plat_per_ducat" | "sell";

export interface DucatBoardRow {
  urlName: string;
  itemName: string;
  thumb: string | null;
  ducats: number;
  lowestSell: number | null;
  volume48h: number | null;
  scannedAt: string | null;
  platPerDucat: number | null;
  recommendation: "sell" | "junk" | "unknown";
}

export interface RelicBoardRow {
  name: string;
  era: string;
  code: string;
  vaulted: boolean;
  intactEv: number | null;
  radiantEv: number | null;
  pricedDrops: number;
  totalDrops: number;
}

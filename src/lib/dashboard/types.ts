import type { AlertType, ScanStatus } from "@/lib/supabase/database.types";
import type { ModRarity, ModRecommendation } from "@/lib/market";

export interface CatalogHit {
  urlName: string;
  itemName: string;
  thumb: string | null;
}

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

export interface ScanStatusSummary {
  status: ScanStatus;
  offset: number;
  lastRunAt: string | null;
  totalItems: number;
  scannedItems: number;
  watchlistCount: number;
  alertsToday: number;
}

export interface HistoryPoint {
  scannedAt: string;
  lowestSell: number | null;
  highestBuy: number | null;
  spread: number | null;
  roiPct: number | null;
  median48h: number | null;
  volume48h: number | null;
}

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

export interface SyndicateSection {
  syndicate: string;
  mods: SyndicateAugmentRow[];
  unscanned: boolean;
}

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

import type { AlertType, ScanStatus } from "@/lib/supabase/database.types";

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

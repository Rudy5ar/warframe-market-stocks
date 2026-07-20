import type { AlertType, ScanStatus } from "@/lib/supabase/database.types";

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

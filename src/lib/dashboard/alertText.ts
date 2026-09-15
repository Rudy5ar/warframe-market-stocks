import type { AlertRow } from "@/lib/dashboard/types";
import { formatPercent, formatPlatinum } from "@/lib/format";

export function alertDetail(row: AlertRow): string {
  if (row.type === "spread") {
    return `${formatPlatinum(row.payload.spread ?? null)} spread · ${formatPercent(row.payload.roi_pct ?? null)} ROI`;
  }
  return `Sell ${formatPlatinum(row.payload.lowest_sell ?? null)} vs median ${formatPlatinum(row.payload.median_48h ?? null)}`;
}

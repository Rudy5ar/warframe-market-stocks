import { wfmRequestV1 } from "./client";
import type { WfmItemStatistics } from "./types";

/**
 * Fetches trade statistics for an item (API v1 — still required; v2 has no
 * per-item statistics endpoint yet).
 */
export async function getItemStatistics(
  urlName: string,
): Promise<WfmItemStatistics> {
  return wfmRequestV1<WfmItemStatistics>(`/items/${urlName}/statistics`);
}

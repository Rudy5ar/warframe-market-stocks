import { wfmRequest } from "./client";
import type { WfmItemStatistics } from "./types";

/**
 * Fetches trade statistics (closed + live, 48h/90d) for an item.
 * This endpoint only exists in v1 - it has no v2 equivalent.
 */
export async function getItemStatistics(
  urlName: string
): Promise<WfmItemStatistics> {
  return wfmRequest<WfmItemStatistics>(`/items/${urlName}/statistics`);
}

import { wfmRequest } from "./client";
import type { WfmItemStatistics } from "./types";

export async function getItemStatistics(
  urlName: string
): Promise<WfmItemStatistics> {
  return wfmRequest<WfmItemStatistics>(`/items/${urlName}/statistics`);
}

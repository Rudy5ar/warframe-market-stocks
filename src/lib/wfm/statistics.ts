import { wfmRequestV1 } from "./client";
import type { WfmItemStatistics } from "./types";

export async function getItemStatistics(
  urlName: string,
): Promise<WfmItemStatistics> {
  return wfmRequestV1<WfmItemStatistics>(`/items/${urlName}/statistics`);
}

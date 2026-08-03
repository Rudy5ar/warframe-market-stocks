import { wfmRequestV2 } from "./client";
import type { WfmItemShort, WfmV2Item } from "./types";

/** Fetches the full tradable items manifest (API v2). */
export async function getItems(): Promise<WfmItemShort[]> {
  const items = await wfmRequestV2<WfmV2Item[]>("/items");

  return items.map((item) => ({
    id: item.id,
    url_name: item.slug,
    item_name: item.i18n?.en?.name ?? item.slug,
    thumb: item.i18n?.en?.thumb ?? item.i18n?.en?.icon ?? "",
    tags: item.tags ?? [],
  }));
}

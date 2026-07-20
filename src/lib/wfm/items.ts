import { wfmRequest } from "./client";
import type { WfmItemShort } from "./types";

/** Fetches the full tradable items manifest. */
export async function getItems(): Promise<WfmItemShort[]> {
  const payload = await wfmRequest<{ items: WfmItemShort[] }>("/items");
  return payload.items;
}

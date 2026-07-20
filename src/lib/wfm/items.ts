import { wfmRequest } from "./client";
import type { WfmItemShort } from "./types";

export async function getItems(): Promise<WfmItemShort[]> {
  const payload = await wfmRequest<{ items: WfmItemShort[] }>("/items");
  return payload.items;
}

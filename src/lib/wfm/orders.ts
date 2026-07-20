import { wfmRequest } from "./client";
import type { WfmOrder } from "./types";

/** Fetches all orders for an item, identified by its `url_name`. */
export async function getItemOrders(urlName: string): Promise<WfmOrder[]> {
  const payload = await wfmRequest<{ orders: WfmOrder[] }>(
    `/items/${urlName}/orders`
  );
  return payload.orders;
}

/**
 * Keeps only orders from users who are actually reachable to trade
 * (`ingame` or `online`), matching the project's actionable-price rules.
 */
export function filterActionableOrders(orders: WfmOrder[]): WfmOrder[] {
  return orders.filter(
    (order) => order.user.status === "ingame" || order.user.status === "online"
  );
}

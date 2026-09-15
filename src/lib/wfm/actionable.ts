import type { WfmOrder } from "./types";

/**
 * Keeps only visible listings from users who are in Warframe (`ingame`).
 * Website-only `online` and `offline` orders cannot trade until they load in.
 */
export function filterActionableOrders(orders: WfmOrder[]): WfmOrder[] {
  return orders.filter(
    (order) => order.visible && order.user.status === "ingame",
  );
}

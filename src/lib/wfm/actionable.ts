import type { WfmOrder } from "./types";

export function filterActionableOrders(orders: WfmOrder[]): WfmOrder[] {
  return orders.filter(
    (order) => order.visible && order.user.status === "ingame",
  );
}

import { wfmRequest } from "./client";
import type { WfmOrder } from "./types";

export async function getItemOrders(urlName: string): Promise<WfmOrder[]> {
  const payload = await wfmRequest<{ orders: WfmOrder[] }>(
    `/items/${urlName}/orders`
  );
  return payload.orders;
}

export function filterActionableOrders(orders: WfmOrder[]): WfmOrder[] {
  return orders.filter(
    (order) => order.user.status === "ingame" || order.user.status === "online"
  );
}

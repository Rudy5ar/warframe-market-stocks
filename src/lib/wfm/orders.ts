import { wfmRequestV2 } from "./client";
import type { WfmOrder, WfmV2Order } from "./types";

function mapV2Order(order: WfmV2Order): WfmOrder {
  return {
    id: order.id,
    platinum: order.platinum,
    quantity: order.quantity,
    order_type: order.type,
    platform: order.user.platform ?? "pc",
    region: order.user.locale ?? "",
    visible: order.visible,
    rank: order.rank,
    subtype: order.subtype,
    per_trade: order.perTrade,
    creation_date: order.createdAt,
    last_update: order.updatedAt,
    user: {
      id: order.user.id,
      ingame_name: order.user.ingameName,
      status: order.user.status,
      reputation: order.user.reputation,
      region: order.user.locale ?? "",
      avatar: order.user.avatar,
      last_seen: order.user.lastSeen,
    },
  };
}

export async function getItemOrders(urlName: string): Promise<WfmOrder[]> {
  const orders = await wfmRequestV2<WfmV2Order[]>(`/orders/item/${urlName}`);
  return orders.map(mapV2Order);
}

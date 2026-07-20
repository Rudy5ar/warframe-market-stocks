
export type WfmOrderType = "buy" | "sell";

export type WfmUserStatus = "offline" | "ingame" | "online";

export interface WfmItemShort {
  id: string;
  url_name: string;
  item_name: string;
  thumb: string;
}

export interface WfmOrderUser {
  id: string;
  ingame_name: string;
  status: WfmUserStatus;
  reputation: number;
  region: string;
  avatar?: string;
  last_seen?: string;
}

export interface WfmOrder {
  id: string;
  platinum: number;
  quantity: number;
  order_type: WfmOrderType;
  platform: string;
  region: string;
  visible: boolean;
  creation_date?: string;
  last_update?: string;
  user: WfmOrderUser;
}

export interface WfmStatisticEntry {
  id: string;
  datetime: string;
  volume: number;
  min_price: number;
  max_price: number;
  open_price: number;
  closed_price: number;
  avg_price: number;
  wa_price: number;
  median: number;
  moving_avg?: number;
  donch_top: number;
  donch_bot: number;
}

export interface WfmStatisticsWindow {
  "48hours": WfmStatisticEntry[];
  "90days": WfmStatisticEntry[];
}

export interface WfmItemStatistics {
  statistics_closed: WfmStatisticsWindow;
  statistics_live: WfmStatisticsWindow;
}

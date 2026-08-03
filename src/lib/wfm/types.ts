/**
 * Types for Warframe.market API access.
 *
 * Items + orders use v2; statistics still use v1. Internal shapes are normalized
 * to a stable app-facing contract (`url_name`, `order_type`, snake_case user fields).
 */

export type WfmOrderType = "buy" | "sell";

export type WfmUserStatus = "offline" | "ingame" | "online";

export interface WfmItemShort {
  id: string;
  url_name: string;
  item_name: string;
  thumb: string;
  tags: string[];
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

/** Raw v2 catalog item (subset we care about). */
export interface WfmV2Item {
  id: string;
  slug: string;
  tags?: string[];
  i18n?: {
    en?: {
      name?: string;
      icon?: string;
      thumb?: string;
    };
  };
}

/** Raw v2 order (subset we care about). */
export interface WfmV2Order {
  id: string;
  type: WfmOrderType;
  platinum: number;
  quantity: number;
  visible: boolean;
  createdAt?: string;
  updatedAt?: string;
  user: {
    id: string;
    ingameName: string;
    status: WfmUserStatus;
    reputation: number;
    platform?: string;
    locale?: string;
    avatar?: string;
    lastSeen?: string;
  };
}

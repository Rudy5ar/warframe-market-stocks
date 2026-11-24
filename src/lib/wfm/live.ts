import "server-only";

const WFM_V1_BASE = "https://api.warframe.market/v1";
const WFM_V2_BASE = "https://api.warframe.market/v2";

function wfmHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    Platform: "pc",
    "User-Agent":
      process.env.WFM_USER_AGENT?.trim() || "tenno-desk/0.1 (warframe.market companion)",
  };
}

export interface LiveDucatEntry {
  itemId: string;
  ducats: number;
  median: number;
  waPrice: number;
  ducatsPerPlat: number;
  ducatsPerPlatWa: number;
  volume: number;
  datetime: string;
  positionChangeDay: number;
}

interface RawDucatRow {
  item: string;
  ducats: number;
  median: number;
  wa_price: number;
  ducats_per_platinum: number;
  ducats_per_platinum_wa: number;
  volume: number;
  datetime: string;
  position_change_day?: number;
}

interface RawDucatsPayload {
  payload?: {
    previous_hour?: RawDucatRow[];
    previous_day?: RawDucatRow[];
  };
}

export async function getLiveDucatFeed(): Promise<Map<string, LiveDucatEntry>> {
  const map = new Map<string, LiveDucatEntry>();
  try {
    const res = await fetch(`${WFM_V1_BASE}/tools/ducats`, {
      headers: wfmHeaders(),
      next: { revalidate: 900 },
    });
    if (!res.ok) return map;
    const json = (await res.json()) as RawDucatsPayload;
    // Prefer previous_hour for freshest prices; fall back to previous_day for lower-volume items.
    const dayRows = json.payload?.previous_day ?? [];
    const hourRows = json.payload?.previous_hour ?? [];

    for (const row of [...dayRows, ...hourRows]) {
      if (!row?.item || typeof row.ducats !== "number") continue;
      map.set(row.item, {
        itemId: row.item,
        ducats: row.ducats,
        median: row.median,
        waPrice: row.wa_price,
        ducatsPerPlat: row.ducats_per_platinum,
        ducatsPerPlatWa: row.ducats_per_platinum_wa,
        volume: row.volume,
        datetime: row.datetime,
        positionChangeDay: row.position_change_day ?? 0,
      });
    }
  } catch {
    // Callers fall back cleanly to DB snapshots.
  }
  return map;
}

export interface LiveOrderUser {
  ingameName: string;
  status: "ingame" | "online" | "offline" | string;
  reputation?: number;
}

export interface LiveOrder {
  id: string;
  type: "sell" | "buy";
  platinum: number;
  quantity: number;
  perTrade: number;
  rank: number | null;
  subtype: string | null;
  itemId: string;
  createdAt: string;
  updatedAt: string;
  user: LiveOrderUser;
}

interface RawV2Order {
  id: string;
  type: "sell" | "buy";
  platinum: number;
  quantity?: number;
  perTrade?: number;
  rank?: number;
  subtype?: string;
  visible?: boolean;
  itemId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    ingameName?: string;
    status?: string;
    reputation?: number;
  };
}

function mapRawOrder(raw: RawV2Order): LiveOrder | null {
  if (!raw || raw.visible === false || typeof raw.platinum !== "number") return null;
  if (!raw.user?.ingameName) return null;
  return {
    id: raw.id,
    type: raw.type,
    platinum: raw.platinum,
    quantity: raw.quantity ?? 1,
    perTrade: Math.max(1, raw.perTrade ?? 1),
    rank: typeof raw.rank === "number" ? raw.rank : null,
    subtype: typeof raw.subtype === "string" ? raw.subtype : null,
    itemId: raw.itemId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    user: {
      ingameName: raw.user.ingameName,
      status: raw.user.status ?? "offline",
      reputation: raw.user.reputation,
    },
  };
}

export async function getLiveRecentOrders(): Promise<LiveOrder[]> {
  try {
    const res = await fetch(`${WFM_V2_BASE}/orders/recent`, {
      headers: wfmHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: RawV2Order[] };
    const orders: LiveOrder[] = [];
    for (const raw of json.data ?? []) {
      const mapped = mapRawOrder(raw);
      if (mapped) orders.push(mapped);
    }
    return orders;
  } catch {
    return [];
  }
}

export interface LiveTopOrdersResult {
  sell: LiveOrder[];
  buy: LiveOrder[];
  fetchedAt: string;
}

export async function getLiveTopOrders(slug: string): Promise<LiveTopOrdersResult | null> {
  try {
    const res = await fetch(
      `${WFM_V2_BASE}/orders/item/${encodeURIComponent(slug)}/top`,
      {
        headers: wfmHeaders(),
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { sell?: RawV2Order[]; buy?: RawV2Order[] };
    };
    const sell = (json.data?.sell ?? [])
      .map(mapRawOrder)
      .filter((o): o is LiveOrder => o !== null)
      .sort((a, b) => {
        const aIngame = a.user.status === "ingame" ? 0 : 1;
        const bIngame = b.user.status === "ingame" ? 0 : 1;
        return aIngame - bIngame || a.platinum - b.platinum;
      });

    const buy = (json.data?.buy ?? [])
      .map(mapRawOrder)
      .filter((o): o is LiveOrder => o !== null)
      .sort((a, b) => {
        const aIngame = a.user.status === "ingame" ? 0 : 1;
        const bIngame = b.user.status === "ingame" ? 0 : 1;
        return aIngame - bIngame || b.platinum - a.platinum;
      });

    return { sell, buy, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

export function buildWfmWhisper(
  ingameName: string,
  itemName: string,
  platinum: number,
  rank?: number | null,
): string {
  const rankNote = typeof rank === "number" && rank > 0 ? ` (rank ${rank})` : "";
  return `/w ${ingameName} Hi! I want to buy: "${itemName}${rankNote}" for ${platinum} platinum. (warframe.market)`;
}

import "server-only";

import { NextResponse } from "next/server";

const URL_NAME_PATTERN = /^[a-z0-9_]+$/;
const WFM_ASSETS_BASE = "https://warframe.market/static/assets/";

interface WfmV2ItemPayload {
  data?: {
    slug?: string;
    tags?: string[];
    maxRank?: number;
    ducats?: number;
    i18n?: {
      en?: {
        name?: string;
        description?: string;
        wikiLink?: string;
        icon?: string;
        thumb?: string;
      };
    };
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ urlName: string }> },
) {
  const { urlName } = await context.params;
  const slug = urlName.trim().toLowerCase();
  if (!URL_NAME_PATTERN.test(slug)) {
    return NextResponse.json({ error: "Invalid item slug" }, { status: 400 });
  }

  const userAgent =
    process.env.WFM_USER_AGENT?.trim() || "tenno-desk/0.1 (warframe.market companion)";

  try {
    const res = await fetch(`https://api.warframe.market/v2/item/${encodeURIComponent(slug)}`, {
      headers: {
        Accept: "application/json",
        Platform: "pc",
        "User-Agent": userAgent,
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Item not found" }, { status: res.status === 404 ? 404 : 502 });
    }

    const json = (await res.json()) as WfmV2ItemPayload;
    const en = json.data?.i18n?.en;
    const iconPath = en?.icon ?? en?.thumb ?? null;

    return NextResponse.json(
      {
        name: en?.name ?? slug,
        description: en?.description ?? null,
        wikiLink: en?.wikiLink ?? null,
        ducats: json.data?.ducats ?? null,
        maxRank: json.data?.maxRank ?? null,
        tags: json.data?.tags ?? [],
        imageUrl: iconPath ? `${WFM_ASSETS_BASE}${iconPath}` : null,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Failed to load item preview" }, { status: 502 });
  }
}

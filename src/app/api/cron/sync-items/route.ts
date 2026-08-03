import "server-only";

import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getItems } from "@/lib/wfm";

export const dynamic = "force-dynamic";

/** Upsert chunk size — keeps individual requests to Supabase small. */
const UPSERT_CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function handleSyncItems(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const items = await getItems();
  const supabase = createServiceClient();
  const updatedAt = new Date().toISOString();

  const rows = items.map((item) => ({
    id: item.id,
    url_name: item.url_name,
    item_name: item.item_name,
    thumb: item.thumb,
    tags: item.tags,
    updated_at: updatedAt,
  }));

  for (const batch of chunk(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from("items").upsert(batch, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, count: rows.length });
}

export async function POST(request: Request): Promise<NextResponse> {
  return handleSyncItems(request);
}

export async function GET(request: Request): Promise<NextResponse> {
  return handleSyncItems(request);
}

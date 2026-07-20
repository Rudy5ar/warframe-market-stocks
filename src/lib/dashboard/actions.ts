"use server";

import { revalidatePath } from "next/cache";

import { createServiceClient } from "@/lib/supabase/server";

function normalizeUrlName(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return trimmed.length > 0 ? trimmed : null;
}

/** Pins an item so the scan cron prioritizes it. Safe to call for an already-pinned url_name. */
export async function addWatchlistItem(formData: FormData): Promise<void> {
  const urlName = normalizeUrlName(formData.get("urlName"));
  if (!urlName) return;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("watchlist")
    .upsert({ url_name: urlName }, { onConflict: "url_name", ignoreDuplicates: true });

  if (error) {
    throw new Error(`addWatchlistItem: ${error.message}`);
  }

  revalidatePath("/watchlist");
  revalidatePath("/");
  revalidatePath(`/items/${urlName}`);
}

/** Unpins an item. */
export async function removeWatchlistItem(formData: FormData): Promise<void> {
  const urlName = normalizeUrlName(formData.get("urlName"));
  if (!urlName) return;

  const supabase = createServiceClient();
  const { error } = await supabase.from("watchlist").delete().eq("url_name", urlName);

  if (error) {
    throw new Error(`removeWatchlistItem: ${error.message}`);
  }

  revalidatePath("/watchlist");
  revalidatePath("/");
  revalidatePath(`/items/${urlName}`);
}

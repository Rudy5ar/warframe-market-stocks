"use server";

import { revalidatePath } from "next/cache";

import { readThresholds, scanOneItem } from "@/lib/scan/scanItem";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Hard cap per call so a single action stays well inside serverless time
 * budgets; the client chunks full-syndicate syncs into calls of ~10.
 */
const SCAN_CHUNK_MAX = 25;
const URL_NAME_PATTERN = /^[a-z0-9_]+$/;

function normalizeUrlName(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return trimmed.length > 0 ? trimmed : null;
}

function parseQuantity(raw: FormDataEntryValue | null): number {
  if (typeof raw !== "string" || raw.trim() === "") return 1;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
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

export interface ScanChunkResult {
  scanned: number;
  failed: string[];
}

/**
 * Scans one chunk of url_names (orders + statistics each) on demand.
 * Used by syndicate / ducat / relic sync buttons in small sequential chunks.
 */
export async function scanItemChunk(urlNames: string[]): Promise<ScanChunkResult> {
  const valid = (Array.isArray(urlNames) ? urlNames : [])
    .filter((urlName) => typeof urlName === "string" && URL_NAME_PATTERN.test(urlName))
    .slice(0, SCAN_CHUNK_MAX);

  const supabase = createServiceClient();
  const thresholds = readThresholds();
  const failed: string[] = [];

  for (const urlName of valid) {
    try {
      await scanOneItem(supabase, urlName, thresholds);
    } catch (err) {
      failed.push(`${urlName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { scanned: valid.length - failed.length, failed };
}

/** Alias for syndicate UI — same as scanItemChunk. */
export async function scanSyndicateMods(urlNames: string[]): Promise<ScanChunkResult> {
  return scanItemChunk(urlNames);
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

/** Add or bump quantity for a mod in the don't-dissolve stash. */
export async function addModStashItem(formData: FormData): Promise<void> {
  const urlName = normalizeUrlName(formData.get("urlName"));
  if (!urlName) return;
  const quantity = parseQuantity(formData.get("quantity"));

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("mod_stash")
    .select("quantity")
    .eq("url_name", urlName)
    .maybeSingle();

  const nextQty = (existing?.quantity ?? 0) + quantity;
  const { error } = await supabase.from("mod_stash").upsert(
    { url_name: urlName, quantity: nextQty },
    { onConflict: "url_name" },
  );

  if (error) {
    throw new Error(`addModStashItem: ${error.message}`);
  }

  revalidatePath("/mods");
}

/** Bulk-add url_names (one per line or comma-separated). Each starts at qty 1 if new. */
export async function bulkAddModStash(formData: FormData): Promise<void> {
  const raw = formData.get("bulk");
  if (typeof raw !== "string" || !raw.trim()) return;

  const names = raw
    .split(/[\n,]+/)
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter((name) => URL_NAME_PATTERN.test(name));

  if (names.length === 0) return;

  const supabase = createServiceClient();
  const unique = [...new Set(names)].slice(0, 100);

  const { data: existing } = await supabase
    .from("mod_stash")
    .select("url_name, quantity")
    .in("url_name", unique);

  const qtyByUrl = new Map((existing ?? []).map((row) => [row.url_name, row.quantity]));

  const rows = unique.map((urlName) => ({
    url_name: urlName,
    quantity: (qtyByUrl.get(urlName) ?? 0) + 1,
  }));

  const { error } = await supabase.from("mod_stash").upsert(rows, { onConflict: "url_name" });
  if (error) {
    throw new Error(`bulkAddModStash: ${error.message}`);
  }

  revalidatePath("/mods");
}

export async function removeModStashItem(formData: FormData): Promise<void> {
  const urlName = normalizeUrlName(formData.get("urlName"));
  if (!urlName) return;

  const supabase = createServiceClient();
  const { error } = await supabase.from("mod_stash").delete().eq("url_name", urlName);

  if (error) {
    throw new Error(`removeModStashItem: ${error.message}`);
  }

  revalidatePath("/mods");
}

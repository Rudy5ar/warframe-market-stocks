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
 * Scans one chunk of a syndicate's mods (orders + statistics each) on demand.
 * The `/syndicates` client drives the full list in small sequential chunks so
 * it can show live progress; per-item failures are tolerated and reported.
 */
export async function scanSyndicateMods(urlNames: string[]): Promise<ScanChunkResult> {
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

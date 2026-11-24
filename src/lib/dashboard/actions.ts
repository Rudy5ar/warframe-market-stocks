"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminUser } from "@/lib/auth/policy";
import { MAX_MOD_STASH_ITEMS, MAX_WATCHLIST_PINS } from "@/lib/config/limits";
import { searchCatalog } from "@/lib/dashboard/queries";
import { fastRefreshTopOrders } from "@/lib/scan/fastSyndicateRefresh";
import { readThresholds, scanOneItem } from "@/lib/scan/scanItem";
import { createServiceClient, createUserClient, getAuthUser } from "@/lib/supabase/server";

const SCAN_CHUNK_MAX = 25;
const URL_NAME_PATTERN = /^[a-z0-9_]+$/;
const OWNER_ONLY_SCAN_ERROR = "Owner access required to sync catalog prices.";

export interface MutationResult {
  error: string | null;
}

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

async function requireUserClient() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function addWatchlistItem(formData: FormData): Promise<MutationResult> {
  const urlName = normalizeUrlName(formData.get("urlName"));
  if (!urlName) return { error: null };

  const { supabase, user } = await requireUserClient();
  const { error } = await supabase.from("watchlist").upsert(
    { user_id: user.id, url_name: urlName },
    { onConflict: "user_id,url_name", ignoreDuplicates: true },
  );

  if (error) {
    if (error.code === "23514" || /watchlist limit reached/i.test(error.message)) {
      return { error: `Watchlist limit reached (max ${MAX_WATCHLIST_PINS} pins per account).` };
    }
    return { error: "Could not pin item. Please try again." };
  }

  revalidatePath("/watchlist");
  revalidatePath("/");
  revalidatePath(`/items/${urlName}`);
  return { error: null };
}

export interface ScanChunkResult {
  scanned: number;
  failed: string[];
}

export async function scanItemChunk(urlNames: string[]): Promise<ScanChunkResult> {
  const user = await getAuthUser();
  if (!isAdminUser(user)) {
    return { scanned: 0, failed: [OWNER_ONLY_SCAN_ERROR] };
  }

  const valid = [
    ...new Set(
      (Array.isArray(urlNames) ? urlNames : []).filter(
        (urlName) => typeof urlName === "string" && URL_NAME_PATTERN.test(urlName),
      ),
    ),
  ].slice(0, SCAN_CHUNK_MAX);

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

export async function scanSyndicateMods(urlNames: string[]): Promise<ScanChunkResult> {
  const user = await getAuthUser();
  if (!isAdminUser(user)) {
    return { scanned: 0, failed: [OWNER_ONLY_SCAN_ERROR] };
  }

  const valid = [
    ...new Set(
      (Array.isArray(urlNames) ? urlNames : []).filter(
        (urlName) => typeof urlName === "string" && URL_NAME_PATTERN.test(urlName),
      ),
    ),
  ].slice(0, SCAN_CHUNK_MAX);

  const supabase = createServiceClient();
  const summary = await fastRefreshTopOrders(supabase, valid, { timeBudgetMs: 25_000 });
  return { scanned: summary.items.length, failed: summary.failed };
}

export async function removeWatchlistItem(formData: FormData): Promise<void> {
  const urlName = normalizeUrlName(formData.get("urlName"));
  if (!urlName) return;

  const { supabase, user } = await requireUserClient();
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("url_name", urlName);

  if (error) {
    throw new Error(`removeWatchlistItem: ${error.message}`);
  }

  revalidatePath("/watchlist");
  revalidatePath("/");
  revalidatePath(`/items/${urlName}`);
}

export async function addModStashItem(formData: FormData): Promise<MutationResult> {
  const urlName = normalizeUrlName(formData.get("urlName"));
  if (!urlName) return { error: null };
  const quantity = parseQuantity(formData.get("quantity"));

  const { supabase, user } = await requireUserClient();
  const { data: existing } = await supabase
    .from("mod_stash")
    .select("quantity")
    .eq("user_id", user.id)
    .eq("url_name", urlName)
    .maybeSingle();

  const nextQty = (existing?.quantity ?? 0) + quantity;
  const { error } = await supabase.from("mod_stash").upsert(
    { user_id: user.id, url_name: urlName, quantity: nextQty },
    { onConflict: "user_id,url_name" },
  );

  if (error) {
    if (error.code === "23514" || /mod stash limit reached/i.test(error.message)) {
      return { error: `Mod stash limit reached (max ${MAX_MOD_STASH_ITEMS} mods per account).` };
    }
    return { error: "Could not add mod to stash. Please try again." };
  }

  revalidatePath("/mods");
  revalidatePath("/");
  return { error: null };
}

export async function bulkAddModStash(formData: FormData): Promise<MutationResult> {
  const raw = formData.get("bulk");
  if (typeof raw !== "string" || !raw.trim()) return { error: null };

  const names = raw
    .split(/[\n,]+/)
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter((name) => URL_NAME_PATTERN.test(name));

  if (names.length === 0) return { error: null };

  const { supabase, user } = await requireUserClient();
  const unique = [...new Set(names)].slice(0, 100);

  const [{ data: existing }, { count: currentTotal }] = await Promise.all([
    supabase
      .from("mod_stash")
      .select("url_name, quantity")
      .eq("user_id", user.id)
      .in("url_name", unique),
    supabase.from("mod_stash").select("url_name", { count: "exact", head: true }),
  ]);

  const qtyByUrl = new Map((existing ?? []).map((row) => [row.url_name, row.quantity]));
  const newCount = unique.filter((urlName) => !qtyByUrl.has(urlName)).length;
  if ((currentTotal ?? 0) + newCount > MAX_MOD_STASH_ITEMS) {
    const remaining = Math.max(0, MAX_MOD_STASH_ITEMS - (currentTotal ?? 0));
    return {
      error: `Mod stash limit is ${MAX_MOD_STASH_ITEMS} mods (${remaining} slots left).`,
    };
  }

  const rows = unique.map((urlName) => ({
    user_id: user.id,
    url_name: urlName,
    quantity: (qtyByUrl.get(urlName) ?? 0) + 1,
  }));

  const { error } = await supabase
    .from("mod_stash")
    .upsert(rows, { onConflict: "user_id,url_name" });
  if (error) {
    if (error.code === "23514" || /mod stash limit reached/i.test(error.message)) {
      return { error: `Mod stash limit reached (max ${MAX_MOD_STASH_ITEMS} mods per account).` };
    }
    return { error: "Could not bulk-add mods. Please try again." };
  }

  revalidatePath("/mods");
  revalidatePath("/");
  return { error: null };
}

export async function removeModStashItem(formData: FormData): Promise<void> {
  const urlName = normalizeUrlName(formData.get("urlName"));
  if (!urlName) return;

  const { supabase, user } = await requireUserClient();
  const { error } = await supabase
    .from("mod_stash")
    .delete()
    .eq("user_id", user.id)
    .eq("url_name", urlName);

  if (error) {
    throw new Error(`removeModStashItem: ${error.message}`);
  }

  revalidatePath("/mods");
  revalidatePath("/");
}

export async function searchCatalogAction(query: string) {
  return searchCatalog(query);
}

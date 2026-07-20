import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Deletes `item_snapshot_history` rows older than `olderThanDays`
 * (default 7, matching the project's history retention window). Throws on
 * a Supabase error rather than swallowing it. Returns the number of rows
 * deleted.
 */
export async function pruneSnapshotHistory(
  supabase: SupabaseClient<Database>,
  olderThanDays = 7,
): Promise<number> {
  const cutoffIso = new Date(
    Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error, count } = await supabase
    .from("item_snapshot_history")
    .delete({ count: "exact" })
    .lt("scanned_at", cutoffIso);

  if (error) {
    throw new Error(`Failed to prune item_snapshot_history: ${error.message}`);
  }

  return count ?? 0;
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

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

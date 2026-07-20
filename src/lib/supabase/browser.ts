import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

let browserClient: SupabaseClient<Database> | undefined;

function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase public env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    );
  }

  return { url, anonKey };
}

/** Lazy singleton for client-side dashboard reads (anon key). */
export function createBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error(
      "createBrowserClient() must be called from a Client Component or browser context.",
    );
  }

  if (!browserClient) {
    const { url, anonKey } = getPublicSupabaseEnv();

    browserClient = createClient<Database>(url, anonKey);
  }

  return browserClient;
}

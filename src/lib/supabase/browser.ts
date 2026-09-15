import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

let browserClient: SupabaseClient<Database> | undefined;

/** Lazy singleton for Client Components. Cookie session is shared with SSR. */
export function createBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error(
      "createBrowserClient() must be called from a Client Component or browser context.",
    );
  }

  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        "Missing Supabase public env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
      );
    }
    browserClient = createSsrBrowserClient<Database>(url, anonKey);
  }

  return browserClient;
}

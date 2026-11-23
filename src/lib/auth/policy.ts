import "server-only";

import type { User } from "@supabase/supabase-js";

import { getProfileConfig } from "@/lib/config/profile";

export const MIN_PASSWORD_LENGTH = 10;

export function isPublicSignupEnabled(): boolean {
  return getProfileConfig().allowPublicSignups;
}

function configuredAdminIds(): ReadonlySet<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.app_metadata?.role === "admin") return true;
  return configuredAdminIds().has(user.id);
}

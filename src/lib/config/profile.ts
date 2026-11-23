import "server-only";

export type AppEnv = "development" | "preview" | "production";

export interface ProfileConfig {
  env: AppEnv;
  isProduction: boolean;
  allowPublicSignups: boolean;
  siteUrl: string | null;
}

function parseAppEnv(raw: string | undefined): AppEnv | null {
  if (raw === "development" || raw === "preview" || raw === "production") {
    return raw;
  }
  return null;
}

function parseBoolEnv(raw: string | undefined): boolean | null {
  if (raw === undefined) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return null;
}

function parseOrigin(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
  } catch {
    return null;
  }
  return null;
}

export function getAppEnv(): AppEnv {
  return (
    parseAppEnv(process.env.APP_ENV) ??
    parseAppEnv(process.env.VERCEL_ENV) ??
    (process.env.NODE_ENV === "production" ? "production" : "development")
  );
}

export function getProfileConfig(): ProfileConfig {
  const env = getAppEnv();
  const isProduction = env === "production";
  const explicitSignups = parseBoolEnv(process.env.ALLOW_PUBLIC_SIGNUPS);
  const allowPublicSignups = explicitSignups ?? true;

  let siteUrl: string | null;
  if (env === "preview" && process.env.VERCEL_URL) {
    siteUrl = parseOrigin(`https://${process.env.VERCEL_URL}`);
  } else {
    siteUrl =
      parseOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
      (process.env.VERCEL_URL ? parseOrigin(`https://${process.env.VERCEL_URL}`) : null);
  }

  return {
    env,
    isProduction,
    allowPublicSignups,
    siteUrl,
  };
}

import "server-only";

/**
 * Validates the `Authorization: Bearer <CRON_SECRET>` header shared by the
 * GitHub Actions worker (POST) and Vercel cron (GET) — see
 * `.github/workflows/scan.yml` and `vercel.json`.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

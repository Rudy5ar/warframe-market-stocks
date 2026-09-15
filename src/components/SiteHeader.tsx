import { SiteHeaderBar } from "@/components/SiteHeaderBar";
import { getScanPulse } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";
import { getAuthUser } from "@/lib/supabase/server";

export async function SiteHeader() {
  const [pulse, user] = await Promise.all([getScanPulse(), getAuthUser()]);
  return (
    <SiteHeaderBar
      status={pulse.status}
      lastRunLabel={formatRelativeTime(pulse.lastRunAt)}
      userEmail={user?.email ?? null}
    />
  );
}

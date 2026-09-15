import { SiteHeaderBar } from "@/components/SiteHeaderBar";
import { getScanPulse } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";

export async function SiteHeader() {
  const pulse = await getScanPulse();
  return (
    <SiteHeaderBar status={pulse.status} lastRunLabel={formatRelativeTime(pulse.lastRunAt)} />
  );
}

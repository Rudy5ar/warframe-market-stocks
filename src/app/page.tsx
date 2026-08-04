import Link from "next/link";

import { AlertsStrip } from "@/components/AlertsList";
import { OpportunitiesTable } from "@/components/OpportunitiesTable";
import { ScanStatusBadge } from "@/components/ScanStatusBadge";
import { SnipesTable } from "@/components/SnipesTable";
import { getRecentAlerts, getScanStatus, getSnipes, getTopOpportunities } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [snipes, opportunities, alerts, status] = await Promise.all([
    getSnipes(12),
    getTopOpportunities(10),
    getRecentAlerts(8),
    getScanStatus(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-void-raised px-4 py-3">
        <div className="flex items-center gap-3">
          <ScanStatusBadge status={status.status} />
          <span className="text-sm text-platinum-dim">
            Last run <span className="text-platinum">{formatRelativeTime(status.lastRunAt)}</span>
          </span>
        </div>
        <div className="font-mono-num flex flex-wrap gap-4 text-xs text-platinum-faint">
          <span>
            Scanned <span className="text-platinum-dim">{status.scannedItems}</span> /{" "}
            {status.totalItems}
          </span>
          <span>
            Alerts today <span className="text-platinum-dim">{status.alertsToday}</span>
          </span>
          <Link href="/status" className="text-teal hover:underline">
            Full status →
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-platinum">Recent alerts</h2>
          <Link href="/alerts" className="text-sm text-teal hover:underline">
            View all
          </Link>
        </div>
        <AlertsStrip rows={alerts} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-platinum">Snipes</h2>
            <p className="text-sm text-platinum-faint">
              Buy under the 48h median, relist nearer fair value. Volume-gated.
            </p>
          </div>
          <Link href="/snipes" className="shrink-0 text-sm text-teal hover:underline">
            View all
          </Link>
        </div>
        <SnipesTable rows={snipes} />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-platinum">Top flips</h2>
          <p className="text-sm text-platinum-faint">
            Ranked by ROI% among items clearing the spread/ROI thresholds.
          </p>
        </div>
        <OpportunitiesTable rows={opportunities} />
      </section>
    </div>
  );
}

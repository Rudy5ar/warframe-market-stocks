import { ScanStatusBadge } from "@/components/ScanStatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { getScanStatus } from "@/lib/dashboard";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Status — WF Stocks",
};

export default async function StatusPage() {
  const status = await getScanStatus();
  const progressPct = status.totalItems > 0 ? (status.offset / status.totalItems) * 100 : 0;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Cursor offset", value: `${status.offset} / ${status.totalItems}` },
    { label: "Last run", value: formatDateTime(status.lastRunAt) },
    { label: "Items in catalog", value: String(status.totalItems) },
    { label: "Items with a snapshot", value: String(status.scannedItems) },
    { label: "Watchlist pins", value: String(status.watchlistCount) },
    { label: "Alerts today (UTC)", value: String(status.alertsToday) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scan status"
        description="Catalog scan progress and table counts."
      />

      <div className="flex items-center gap-3 rounded-sm border border-line bg-void-raised px-4 py-3">
        <ScanStatusBadge status={status.status} />
        <span className="text-sm text-platinum-dim">
          Last run <span className="text-platinum">{formatRelativeTime(status.lastRunAt)}</span>
        </span>
      </div>

      <div className="rounded-sm border border-line bg-void-raised px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-xs text-platinum-faint">
          <span>Current cycle progress</span>
          <span className="font-mono-num">{progressPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-void-panel">
          <div
            className="h-full bg-teal transition-[width]"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-line bg-void-raised">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 text-platinum-dim">{row.label}</td>
                <td className="font-mono-num px-3 py-2 text-right text-platinum">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

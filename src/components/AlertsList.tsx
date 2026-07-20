import Link from "next/link";
import { ArrowDownRight, TrendingUp } from "lucide-react";

import type { AlertRow } from "@/lib/dashboard";
import { formatDateTime, formatPercent, formatPlatinum, formatRelativeTime } from "@/lib/format";

const TYPE_LABEL: Record<AlertRow["type"], string> = {
  spread: "Spread",
  price_drop: "Price drop",
};

const TYPE_STYLE: Record<AlertRow["type"], string> = {
  spread: "text-teal",
  price_drop: "text-amber",
};

function AlertIcon({ type }: { type: AlertRow["type"] }) {
  const className = `h-3.5 w-3.5 ${TYPE_STYLE[type]}`;
  return type === "spread" ? (
    <TrendingUp className={className} aria-hidden />
  ) : (
    <ArrowDownRight className={className} aria-hidden />
  );
}

function alertDetail(row: AlertRow): string {
  if (row.type === "spread") {
    return `${formatPlatinum(row.payload.spread ?? null)} spread · ${formatPercent(row.payload.roi_pct ?? null)} ROI`;
  }
  return `Sell ${formatPlatinum(row.payload.lowest_sell ?? null)} vs median ${formatPlatinum(row.payload.median_48h ?? null)}`;
}

/** Compact horizontal strip for the home page. */
export function AlertsStrip({ rows }: { rows: AlertRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-platinum-faint">No alerts fired yet.</p>;
  }

  return (
    <div className="scroll-thin flex gap-3 overflow-x-auto pb-1">
      {rows.map((row) => (
        <Link
          key={row.id}
          href={`/items/${row.urlName}`}
          className="flex min-w-[220px] shrink-0 flex-col gap-1.5 rounded border border-line bg-void-raised px-3 py-2.5 transition-colors hover:border-line-strong"
        >
          <span className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${TYPE_STYLE[row.type]}`}>
            <AlertIcon type={row.type} />
            {TYPE_LABEL[row.type]}
          </span>
          <span className="text-sm text-platinum">{row.itemName}</span>
          <span className="font-mono-num text-xs text-platinum-dim">{alertDetail(row)}</span>
          <span className="text-xs text-platinum-faint">{formatRelativeTime(row.createdAt)}</span>
        </Link>
      ))}
    </div>
  );
}

/** Full dense feed table for `/alerts`. */
export function AlertsTable({ rows }: { rows: AlertRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
        No alerts yet. They will appear here once a scan finds a spread/ROI or price-drop
        opportunity.
      </p>
    );
  }

  return (
    <div className="scroll-thin overflow-x-auto rounded border border-line">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-platinum-faint">
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium">Detail</th>
            <th className="px-3 py-2 font-medium">Fired</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0 transition-colors hover:bg-void-raised">
              <td className="px-3 py-2">
                <span className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${TYPE_STYLE[row.type]}`}>
                  <AlertIcon type={row.type} />
                  {TYPE_LABEL[row.type]}
                </span>
              </td>
              <td className="px-3 py-2">
                <Link href={`/items/${row.urlName}`} className="text-platinum hover:text-teal">
                  {row.itemName}
                </Link>
              </td>
              <td className="font-mono-num px-3 py-2 text-platinum-dim">{alertDetail(row)}</td>
              <td className="px-3 py-2 text-xs text-platinum-faint" title={formatDateTime(row.createdAt)}>
                {formatRelativeTime(row.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

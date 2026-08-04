import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { SnipeRow } from "@/lib/dashboard";
import {
  formatDateTime,
  formatPercent,
  formatPlatinum,
  formatVolume,
  wfmItemUrl,
} from "@/lib/format";

export function SnipesTable({ rows }: { rows: SnipeRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
        No snipes right now — nothing under the median with enough 48h volume. Check back after
        the next scan.
      </p>
    );
  }

  return (
    <div className="scroll-thin overflow-x-auto rounded border border-line">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-platinum-faint">
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium">Buy now</th>
            <th className="px-3 py-2 font-medium">Median 48h</th>
            <th className="px-3 py-2 font-medium">Discount</th>
            <th className="px-3 py-2 font-medium">Vol 48h</th>
            <th className="px-3 py-2 font-medium">Scanned</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.urlName}
              className="border-b border-line last:border-b-0 transition-colors hover:bg-void-raised"
            >
              <td className="px-3 py-2">
                <Link href={`/items/${row.urlName}`} className="text-platinum hover:text-teal">
                  {row.itemName}
                </Link>
              </td>
              <td className="font-mono-num px-3 py-2 font-medium text-teal">
                {formatPlatinum(row.lowestSell)}
              </td>
              <td className="font-mono-num px-3 py-2 text-platinum-dim">
                {formatPlatinum(row.median48h)}
              </td>
              <td className="font-mono-num px-3 py-2 font-medium text-amber">
                {formatPercent(row.discountPct)}
              </td>
              <td className="font-mono-num px-3 py-2 text-platinum-dim">
                {formatVolume(row.volume48h)}
              </td>
              <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                {formatDateTime(row.scannedAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <a
                  href={wfmItemUrl(row.urlName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${row.itemName} on warframe.market`}
                  className="text-platinum-faint transition-colors hover:text-teal"
                >
                  <ExternalLink size={14} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

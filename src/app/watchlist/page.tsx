import Link from "next/link";

import { AddWatchlistForm, RemoveWatchlistButton } from "@/components/WatchlistForms";
import { getWatchlist } from "@/lib/dashboard";
import { formatDateTime, formatItemName, formatPercent, formatPlatinum } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Watchlist — WF Stocks",
};

export default async function WatchlistPage() {
  const rows = await getWatchlist();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-platinum">Watchlist</h1>
        <p className="text-sm text-platinum-faint">
          Pinned items are scanned first each cycle, ahead of the general catalog rotation.
        </p>
      </div>

      <AddWatchlistForm />

      {rows.length === 0 ? (
        <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
          No pins yet. Add a warframe.market <code className="font-mono-num">url_name</code> above.
        </p>
      ) : (
        <div className="scroll-thin overflow-x-auto rounded border border-line">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-platinum-faint">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Sell</th>
                <th className="px-3 py-2 font-medium">Spread</th>
                <th className="px-3 py-2 font-medium">ROI</th>
                <th className="px-3 py-2 font-medium">Scanned</th>
                <th className="px-3 py-2 font-medium">Pinned</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.urlName} className="border-b border-line last:border-b-0 transition-colors hover:bg-void-raised">
                  <td className="px-3 py-2">
                    {row.isOrphan ? (
                      <span className="text-platinum-faint" title="Not yet synced from the item manifest">
                        {formatItemName(row.urlName)}{" "}
                        <span className="text-xs uppercase tracking-wide text-amber">pending sync</span>
                      </span>
                    ) : (
                      <Link href={`/items/${row.urlName}`} className="text-platinum hover:text-teal">
                        {row.itemName}
                      </Link>
                    )}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-platinum-dim">
                    {formatPlatinum(row.lowestSell)}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-platinum">
                    {formatPlatinum(row.spread)}
                  </td>
                  <td className="font-mono-num px-3 py-2 font-medium text-teal">
                    {formatPercent(row.roiPct)}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                    {formatDateTime(row.scannedAt)}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                    {formatDateTime(row.pinnedAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <RemoveWatchlistButton urlName={row.urlName} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

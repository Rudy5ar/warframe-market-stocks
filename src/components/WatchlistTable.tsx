"use client";

import { RemoveWatchlistButton } from "@/components/WatchlistForms";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterInput, useTextFilter } from "@/components/ui/FilterInput";
import { ItemNameLink } from "@/components/ui/ItemNameLink";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import type { WatchlistRow } from "@/lib/dashboard/types";
import { formatDateTime, formatItemName, formatPercent, formatPlatinum } from "@/lib/format";

export function WatchlistTable({ rows }: { rows: WatchlistRow[] }) {
  const { query, setQuery, filtered } = useTextFilter(
    rows,
    (row) => `${row.itemName ?? ""} ${row.urlName}`,
  );

  if (rows.length === 0) {
    return (
      <EmptyState>No pins yet. Search a name above or paste a warframe.market slug.</EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter pins…" />
      {filtered.length === 0 ? (
        <EmptyState>No pins match that filter.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>Sell</Th>
              <Th>Spread</Th>
              <Th>ROI</Th>
              <Th>Scanned</Th>
              <Th>Pinned</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <Tr key={row.urlName}>
                <td className="px-3 py-2">
                  {row.isOrphan ? (
                    <ItemNameLink
                      urlName={row.urlName}
                      name={formatItemName(row.urlName)}
                      thumb={row.thumb}
                      orphan
                    />
                  ) : (
                    <ItemNameLink
                      urlName={row.urlName}
                      name={row.itemName ?? row.urlName}
                      thumb={row.thumb}
                    />
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
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

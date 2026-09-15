"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { FilterInput, useTextFilter } from "@/components/ui/FilterInput";
import { ItemNameLink } from "@/components/ui/ItemNameLink";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import { WfmLink } from "@/components/ui/WfmLink";
import type { OpportunityRow } from "@/lib/dashboard/types";
import { formatDateTime, formatPercent, formatPlatinum, formatVolume } from "@/lib/format";
import { nextSellPrice } from "@/lib/market/spread";

export function OpportunitiesTable({ rows }: { rows: OpportunityRow[] }) {
  const { query, setQuery, filtered } = useTextFilter(
    rows,
    (row) => `${row.itemName} ${row.urlName}`,
  );

  if (rows.length === 0) {
    return (
      <EmptyState>
        No flips clear the spread and ROI bar yet. Wait for the next scan.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter flips…" />
      {filtered.length === 0 ? (
        <EmptyState>No flips match that filter.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>Sell</Th>
              <Th>Next</Th>
              <Th>Spread</Th>
              <Th>ROI</Th>
              <Th>Vol 48h</Th>
              <Th>Scanned</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <Tr key={row.urlName}>
                <td className="px-3 py-2">
                  <ItemNameLink urlName={row.urlName} name={row.itemName} thumb={row.thumb} />
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">
                  {formatPlatinum(row.lowestSell)}
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">
                  {formatPlatinum(nextSellPrice(row.lowestSell, row.spread))}
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum">
                  {formatPlatinum(row.spread)}
                </td>
                <td className="font-mono-num px-3 py-2 font-medium text-teal">
                  {formatPercent(row.roiPct)}
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">
                  {formatVolume(row.volume48h)}
                </td>
                <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                  {formatDateTime(row.scannedAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  <WfmLink urlName={row.urlName} itemName={row.itemName} />
                </td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

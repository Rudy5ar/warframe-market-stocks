"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { FilterInput, useTextFilter } from "@/components/ui/FilterInput";
import { ItemNameLink } from "@/components/ui/ItemNameLink";
import { RecBadge } from "@/components/ui/RecBadge";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import { WfmLink } from "@/components/ui/WfmLink";
import type { DucatBoardRow } from "@/lib/dashboard/types";
import { formatDateTime, formatPlatinum, formatVolume } from "@/lib/format";

export function DucatsTable({ rows }: { rows: DucatBoardRow[] }) {
  const { query, setQuery, filtered } = useTextFilter(
    rows,
    (row) => `${row.itemName} ${row.urlName}`,
  );

  if (rows.length === 0) {
    return (
      <EmptyState>
        No ducat parts loaded. Prices show after a scan — use Sync prices if rows are empty.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter parts…" />
      {filtered.length === 0 ? (
        <EmptyState>No parts match that filter.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Part</Th>
              <Th>Sell</Th>
              <Th>Ducats</Th>
              <Th>Plat/ducat</Th>
              <Th>Do</Th>
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
                <td className="font-mono-num px-3 py-2 font-medium text-platinum">
                  {formatPlatinum(row.lowestSell)}
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">{row.ducats}</td>
                <td className="font-mono-num px-3 py-2 text-teal">
                  {row.platPerDucat !== null ? row.platPerDucat.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2">
                  <RecBadge recommendation={row.recommendation} />
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

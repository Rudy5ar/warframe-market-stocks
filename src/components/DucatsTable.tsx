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
    (row) => `${row.itemName} ${row.urlName} ${row.ducats}`,
  );

  if (rows.length === 0) {
    return (
      <EmptyState>
        No ducat parts loaded for this filter. Prices show after a scan.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter prime parts…" />
      {filtered.length === 0 ? (
        <EmptyState>No parts match that filter.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Prime part</Th>
              <Th>Ducats</Th>
              <Th>Lowest ask</Th>
              <Th>Ducats / Plat</Th>
              <Th>Call</Th>
              <Th>Vol 48h</Th>
              <Th>Scanned</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const dppTone =
                row.recommendation === "junk"
                  ? "text-teal"
                  : row.recommendation === "sell"
                    ? "text-gold"
                    : "text-platinum-dim";

              return (
                <Tr key={row.urlName}>
                  <td className="px-3.5 py-2.5">
                    <ItemNameLink urlName={row.urlName} name={row.itemName} thumb={row.thumb} />
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                    {row.ducats}d
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 font-semibold text-platinum">
                    {formatPlatinum(row.lowestSell)}
                  </td>
                  <td className={`font-mono-num px-3.5 py-2.5 font-semibold ${dppTone}`}>
                    {row.ducatsPerPlat !== null ? `${row.ducatsPerPlat.toFixed(1)} d/p` : "—"}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <RecBadge recommendation={row.recommendation} />
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                    {formatVolume(row.volume48h)}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-xs text-platinum-faint">
                    {formatDateTime(row.scannedAt)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <WfmLink urlName={row.urlName} itemName={row.itemName} />
                  </td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

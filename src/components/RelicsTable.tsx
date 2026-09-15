"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { FilterInput, useTextFilter } from "@/components/ui/FilterInput";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import type { RelicBoardRow } from "@/lib/dashboard/types";
import { formatPlatinum } from "@/lib/format";

export function RelicsTable({ rows }: { rows: RelicBoardRow[] }) {
  const { query, setQuery, filtered } = useTextFilter(
    rows,
    (row) => `${row.name} ${row.era} ${row.vaulted ? "vaulted" : "available"}`,
  );

  if (rows.length === 0) {
    return <EmptyState>No relics match these filters.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter relics…" />
      {filtered.length === 0 ? (
        <EmptyState>No relics match that filter.</EmptyState>
      ) : (
        <TableShell minWidth="640px">
          <thead>
            <tr>
              <Th>Relic</Th>
              <Th>Era</Th>
              <Th>Intact EV</Th>
              <Th>Radiant EV</Th>
              <Th>Priced</Th>
              <Th>Vault</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <Tr key={row.name}>
                <td className="px-3 py-2 font-medium text-platinum">{row.name}</td>
                <td className="px-3 py-2 text-platinum-dim">{row.era}</td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">
                  {row.intactEv !== null ? formatPlatinum(Math.round(row.intactEv)) : "—"}
                </td>
                <td className="font-mono-num px-3 py-2 font-medium text-teal">
                  {row.radiantEv !== null ? formatPlatinum(Math.round(row.radiantEv)) : "—"}
                </td>
                <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                  {row.pricedDrops}/{row.totalDrops}
                </td>
                <td className="px-3 py-2 text-xs text-platinum-faint">
                  {row.vaulted ? "Vaulted" : "Available"}
                </td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

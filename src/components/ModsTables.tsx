"use client";

import { RemoveModStashButton } from "@/components/ModStashForms";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterInput, useTextFilter } from "@/components/ui/FilterInput";
import { ItemNameLink } from "@/components/ui/ItemNameLink";
import { RecBadge } from "@/components/ui/RecBadge";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import { WfmLink } from "@/components/ui/WfmLink";
import type { MarketableModRow, ModStashRow } from "@/lib/dashboard/types";
import { formatDateTime, formatPlatinum, formatVolume } from "@/lib/format";

export function StashTable({ rows }: { rows: ModStashRow[] }) {
  const { query, setQuery, filtered } = useTextFilter(
    rows,
    (row) => `${row.itemName ?? ""} ${row.urlName}`,
  );

  if (rows.length === 0) {
    return (
      <EmptyState>Stash is empty. Add excess rare mods you are tempted to dissolve.</EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter stash…" />
      {filtered.length === 0 ? (
        <EmptyState>No mods match that filter.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Mod</Th>
              <Th>Qty</Th>
              <Th>Sell</Th>
              <Th>Endo</Th>
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
                  <ItemNameLink
                    urlName={row.urlName}
                    name={row.itemName ?? row.urlName}
                    thumb={row.thumb}
                    orphan={row.isOrphan}
                  />
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">{row.quantity}</td>
                <td className="font-mono-num px-3 py-2 font-medium text-platinum">
                  {formatPlatinum(row.lowestSell)}
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">
                  {row.endo !== null ? row.endo : "—"}
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
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <WfmLink urlName={row.urlName} itemName={row.itemName ?? row.urlName} />
                    <RemoveModStashButton urlName={row.urlName} />
                  </div>
                </td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

export function DiscoveryTable({ rows }: { rows: MarketableModRow[] }) {
  const { query, setQuery, filtered } = useTextFilter(
    rows,
    (row) => `${row.itemName} ${row.urlName} ${row.rarity ?? ""}`,
  );

  if (rows.length === 0) {
    return (
      <EmptyState>
        No fodder mods in the catalog yet. Add known mods to your stash, or wait until the item
        list is synced.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter fodder…" />
      {filtered.length === 0 ? (
        <EmptyState>No mods match that filter.</EmptyState>
      ) : (
        <TableShell minWidth="640px">
          <thead>
            <tr>
              <Th>Mod</Th>
              <Th>Rarity</Th>
              <Th>Sell</Th>
              <Th>Endo</Th>
              <Th>Do</Th>
              <Th>Vol 48h</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <Tr key={row.urlName}>
                <td className="px-3 py-2">
                  <ItemNameLink urlName={row.urlName} name={row.itemName} thumb={row.thumb} />
                </td>
                <td className="px-3 py-2 text-xs capitalize text-platinum-faint">
                  {row.rarity ?? "—"}
                </td>
                <td className="font-mono-num px-3 py-2 font-medium text-platinum">
                  {formatPlatinum(row.lowestSell)}
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">
                  {row.endo !== null ? row.endo : "—"}
                </td>
                <td className="px-3 py-2">
                  <RecBadge recommendation={row.recommendation} />
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">
                  {formatVolume(row.volume48h)}
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

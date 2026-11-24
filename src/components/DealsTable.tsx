"use client";

import { CopyWhisperButton } from "@/components/ui/CopyWhisperButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterInput, useTextFilter } from "@/components/ui/FilterInput";
import { ItemNameLink } from "@/components/ui/ItemNameLink";
import { RecBadge } from "@/components/ui/RecBadge";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import { WfmLink } from "@/components/ui/WfmLink";
import type { DealMode, DealRow } from "@/lib/dashboard/types";
import { formatDateTime, formatPlatinum, formatRelativeTime, formatVolume } from "@/lib/format";

export function DealsTable({ rows, mode }: { rows: DealRow[]; mode: DealMode }) {
  const { query, setQuery, filtered } = useTextFilter(
    rows,
    (row) => `${row.itemName} ${row.urlName} ${row.sellerName ?? ""}`,
  );

  if (rows.length === 0) {
    return (
      <EmptyState>
        {mode === "live"
          ? "No underpriced in-game listings appeared in the last couple minutes of live orders. Try refreshing in a minute or switch to Cheap (48h avg)."
          : `No liquid ${mode === "cheap" ? "discounts" : mode === "spike" ? "price spikes" : "spreads"} match this filter right now.`}
      </EmptyState>
    );
  }

  const isLiveMode = mode === "live";

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter items…" />
      {filtered.length === 0 ? (
        <EmptyState>No items match that filter.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>{isLiveMode ? "Live ask" : "Lowest ask"}</Th>
              <Th>{mode === "spread" ? "Spread" : "48h avg"}</Th>
              <Th>{mode === "spread" ? "vs 48h avg" : "Difference"}</Th>
              <Th>Vol 48h</Th>
              <Th>{isLiveMode ? "Seller" : "Call"}</Th>
              <Th>{isLiveMode ? "Posted" : "Scanned"}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const isCheap = row.diffPct !== null && row.diffPct < 0;
              const isSpike = row.diffPct !== null && row.diffPct > 0;
              const diffColor = isCheap
                ? "text-teal"
                : isSpike
                  ? "text-red"
                  : "text-platinum-dim";

              return (
                <Tr key={`${row.urlName}-${row.sellerName ?? ""}`}>
                  <td className="px-3.5 py-2.5">
                    <ItemNameLink urlName={row.urlName} name={row.itemName} thumb={row.thumb} />
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 font-semibold text-platinum">
                    {formatPlatinum(row.lowestSell)}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                    {mode === "spread"
                      ? formatPlatinum(row.spread)
                      : row.median48h !== null
                        ? formatPlatinum(Math.round(row.median48h))
                        : "—"}
                  </td>
                  <td className={`font-mono-num px-3.5 py-2.5 font-medium ${diffColor}`}>
                    {row.diffPct !== null && row.diffPlat !== null
                      ? `${row.diffPct > 0 ? "+" : ""}${row.diffPct}% (${row.diffPlat > 0 ? "+" : ""}${row.diffPlat}p)`
                      : "—"}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                    {formatVolume(row.volume48h)}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {isLiveMode && row.sellerName ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-platinum-dim">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
                        {row.sellerName}
                      </span>
                    ) : (
                      <RecBadge recommendation={row.call} />
                    )}
                  </td>
                  <td
                    className="font-mono-num px-3.5 py-2.5 text-xs text-platinum-faint"
                    title={formatDateTime(row.scannedAt)}
                  >
                    {formatRelativeTime(row.scannedAt)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      {row.whisper ? <CopyWhisperButton whisper={row.whisper} compact /> : null}
                      <WfmLink urlName={row.urlName} itemName={row.itemName} />
                    </div>
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

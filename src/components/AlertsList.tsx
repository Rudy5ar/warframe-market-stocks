"use client";

import { ArrowDownRight, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { FilterInput, useTextFilter } from "@/components/ui/FilterInput";
import { ItemNameLink } from "@/components/ui/ItemNameLink";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import type { AlertRow } from "@/lib/dashboard/types";
import { alertDetail } from "@/lib/dashboard/alertText";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

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

export function AlertsTable({ rows }: { rows: AlertRow[] }) {
  const { query, setQuery, filtered } = useTextFilter(
    rows,
    (row) => `${row.itemName} ${row.urlName} ${TYPE_LABEL[row.type]}`,
  );

  if (rows.length === 0) {
    return (
      <EmptyState>
        No alerts yet. They appear when a scan finds a spread/ROI flip or a price drop.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter alerts…" />
      {filtered.length === 0 ? (
        <EmptyState>No alerts match that filter.</EmptyState>
      ) : (
        <TableShell minWidth="640px">
          <thead>
            <tr>
              <Th>Type</Th>
              <Th>Item</Th>
              <Th>Detail</Th>
              <Th>Fired</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <Tr key={row.id}>
                <td className="px-3 py-2">
                  <span
                    className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${TYPE_STYLE[row.type]}`}
                  >
                    <AlertIcon type={row.type} />
                    {TYPE_LABEL[row.type]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <ItemNameLink urlName={row.urlName} name={row.itemName} thumb={row.thumb} />
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">{alertDetail(row)}</td>
                <td
                  className="px-3 py-2 text-xs text-platinum-faint"
                  title={formatDateTime(row.createdAt)}
                >
                  {formatRelativeTime(row.createdAt)}
                </td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

export { TYPE_LABEL, TYPE_STYLE, AlertIcon };

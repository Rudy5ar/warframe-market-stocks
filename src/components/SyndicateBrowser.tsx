"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";

import { SyndicateSyncButton } from "@/components/SyndicateSyncButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterInput, useTextFilter } from "@/components/ui/FilterInput";
import { ItemNameLink } from "@/components/ui/ItemNameLink";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import { WfmLink } from "@/components/ui/WfmLink";
import type { SyndicateSection } from "@/lib/dashboard/types";
import { SYNDICATES, syndicateSlug } from "@/lib/dashboard/syndicates";
import { formatDateTime, formatPercent, formatPlatinum } from "@/lib/format";

function SyndicateTable({ section }: { section: SyndicateSection }) {
  const { query, setQuery, filtered } = useTextFilter(
    section.mods,
    (mod) => `${mod.itemName} ${mod.urlName} ${mod.compat ?? ""}`,
  );

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filter mods…" />
      {filtered.length === 0 ? (
        <EmptyState>No mods match that filter.</EmptyState>
      ) : (
        <TableShell minWidth="640px">
          <thead>
            <tr>
              <Th>Mod</Th>
              <Th>For</Th>
              <Th>Sell</Th>
              <Th>Buy</Th>
              <Th>Spread</Th>
              <Th>ROI</Th>
              <Th>Scanned</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((mod) => (
              <Tr key={mod.urlName}>
                <td className="px-3 py-2">
                  <ItemNameLink urlName={mod.urlName} name={mod.itemName} thumb={mod.thumb} />
                </td>
                <td className="px-3 py-2 text-xs text-platinum-faint">{mod.compat ?? "—"}</td>
                <td className="font-mono-num px-3 py-2 font-medium text-platinum">
                  {formatPlatinum(mod.lowestSell)}
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">
                  {formatPlatinum(mod.highestBuy)}
                </td>
                <td className="font-mono-num px-3 py-2 text-platinum-dim">
                  {formatPlatinum(mod.spread)}
                </td>
                <td className="font-mono-num px-3 py-2 text-teal">{formatPercent(mod.roiPct)}</td>
                <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                  {formatDateTime(mod.scannedAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  <WfmLink urlName={mod.urlName} itemName={mod.itemName} />
                </td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

/**
 * Client-side syndicate filter: clicks toggle instantly without a server
 * round-trip. URL (?hide=) is kept in sync via replaceState for shareable links.
 */
export function SyndicateBrowser({
  sections,
  initialHidden,
}: {
  sections: SyndicateSection[];
  initialHidden: string[];
}) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set(initialHidden));

  function apply(next: ReadonlySet<string>) {
    setHidden(next);
    const href = next.size === 0 ? "/syndicates" : `/syndicates?hide=${[...next].join(",")}`;
    window.history.replaceState(null, "", href);
  }

  function toggle(slug: string) {
    const next = new Set(hidden);
    if (next.has(slug)) {
      next.delete(slug);
    } else {
      next.add(slug);
    }
    apply(next);
  }

  const allHidden = hidden.size === SYNDICATES.length;
  const visible = sections.filter((section) => !hidden.has(syndicateSlug(section.syndicate)));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] tracking-wider text-platinum-faint uppercase">Show</span>
        {SYNDICATES.map((name) => {
          const slug = syndicateSlug(name);
          const isHidden = hidden.has(slug);
          return (
            <button
              key={slug}
              type="button"
              onClick={() => toggle(slug)}
              aria-pressed={!isHidden}
              title={isHidden ? `Show ${name}` : `Hide ${name}`}
              className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                isHidden
                  ? "border-line text-platinum-faint line-through hover:text-platinum-dim"
                  : "border-teal-dim bg-teal-dim/10 text-teal hover:bg-teal-dim/20"
              }`}
            >
              {isHidden ? <EyeOff size={12} /> : null}
              {name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => apply(allHidden ? new Set() : new Set(SYNDICATES.map(syndicateSlug)))}
          className="rounded-sm border border-line px-2.5 py-1 text-xs font-medium text-platinum-dim transition-colors hover:border-teal-dim hover:text-teal"
        >
          {allHidden ? "Select all" : "Deselect all"}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState>All syndicates are hidden. Toggle one back on above.</EmptyState>
      ) : (
        visible.map((section) => (
          <section key={section.syndicate} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-platinum">
                {section.syndicate}
                <span className="ml-2 text-xs font-normal text-platinum-faint">
                  {section.mods.length} mods
                </span>
              </h2>
              <SyndicateSyncButton
                syndicate={section.syndicate}
                urlNames={section.mods.map((mod) => mod.urlName)}
              />
            </div>
            {section.unscanned ? (
              <p className="rounded-sm border border-line bg-void-raised px-4 py-3 text-xs text-platinum-faint">
                Not scanned yet — prices appear after a scan, or press Sync all.
              </p>
            ) : null}
            <SyndicateTable section={section} />
          </section>
        ))
      )}
    </>
  );
}

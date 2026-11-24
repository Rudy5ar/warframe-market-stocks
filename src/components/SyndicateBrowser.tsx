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
import { formatDateTime, formatPlatinum } from "@/lib/format";

function SyndicateTable({ section }: { section: SyndicateSection }) {
  const { query, setQuery, filtered } = useTextFilter(
    section.mods,
    (mod) => `${mod.itemName} ${mod.urlName} ${mod.compat ?? ""}`,
  );

  return (
    <div className="flex flex-col gap-3">
      <FilterInput value={query} onChange={setQuery} placeholder={`Filter ${section.syndicate} mods…`} />
      {filtered.length === 0 ? (
        <EmptyState>No mods match that filter.</EmptyState>
      ) : (
        <TableShell minWidth="620px">
          <thead>
            <tr>
              <Th>Augment mod</Th>
              <Th>Warframe / Weapon</Th>
              <Th>Lowest sell</Th>
              <Th>Highest buy</Th>
              <Th>Scanned</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((mod) => (
              <Tr key={mod.urlName}>
                <td className="px-3.5 py-2.5">
                  <ItemNameLink urlName={mod.urlName} name={mod.itemName} thumb={mod.thumb} />
                </td>
                <td className="px-3.5 py-2.5 text-xs text-platinum-dim">{mod.compat ?? "—"}</td>
                <td className="font-mono-num px-3.5 py-2.5 font-semibold text-gold">
                  {formatPlatinum(mod.lowestSell)}
                </td>
                <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                  {formatPlatinum(mod.highestBuy)}
                </td>
                <td className="font-mono-num px-3.5 py-2.5 text-xs text-platinum-faint">
                  {formatDateTime(mod.scannedAt)}
                </td>
                <td className="px-3.5 py-2.5 text-right">
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

export function SyndicateBrowser({
  sections,
  initialHidden,
  canSync = false,
}: {
  sections: SyndicateSection[];
  initialHidden: string[];
  canSync?: boolean;
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

  function focusOnly(slug: string) {
    const others = SYNDICATES.map(syndicateSlug).filter((s) => s !== slug);
    const isAlreadySolo = hidden.size === others.length && !hidden.has(slug);
    apply(isAlreadySolo ? new Set() : new Set(others));
  }

  const allHidden = hidden.size === SYNDICATES.length;
  const visible = sections.filter((section) => !hidden.has(syndicateSlug(section.syndicate)));

  return (
    <div className="flex flex-col gap-6">
      {/* 6-Syndicate Quick Comparison Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const slug = syndicateSlug(section.syndicate);
          const topMod = section.mods[0];
          const isHidden = hidden.has(slug);
          return (
            <button
              key={slug}
              type="button"
              onClick={() => focusOnly(slug)}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                isHidden
                  ? "border-line/60 bg-void-raised/40 opacity-55 hover:opacity-85"
                  : "border-line bg-void-raised hover:border-gold/50"
              }`}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-wider text-platinum-faint uppercase">
                  {section.syndicate}
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-platinum">
                  {topMod?.itemName ?? "No priced mods yet"}
                </div>
                <div className="mt-0.5 text-xs text-platinum-faint">
                  {topMod?.compat ? `${topMod.compat} · ` : ""}
                  {section.mods.length} augments
                </div>
              </div>
              <span className="font-mono-num shrink-0 rounded-md border border-gold/35 bg-gold/12 px-2.5 py-1 text-base font-bold text-gold">
                {formatPlatinum(topMod?.lowestSell ?? null)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Multi-select visibility chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-platinum-faint uppercase">
          Filter
        </span>
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
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isHidden
                  ? "border-line text-platinum-faint line-through hover:text-platinum-dim"
                  : "border-gold/40 bg-gold/12 text-gold hover:bg-gold/20"
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
          className="rounded-lg border border-line bg-void-raised px-3 py-1.5 text-xs font-medium text-platinum-dim transition-colors hover:border-line-strong hover:text-platinum"
        >
          {allHidden ? "Show all" : "Hide all"}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState>All syndicates are hidden. Toggle one back on above.</EmptyState>
      ) : (
        visible.map((section) => (
          <section key={section.syndicate} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-semibold text-platinum">
                {section.syndicate}
                <span className="ml-2 text-xs font-normal text-platinum-faint">
                  {section.mods.length} augments
                </span>
              </h2>
              {canSync ? (
                <SyndicateSyncButton
                  syndicate={section.syndicate}
                  urlNames={section.mods.map((mod) => mod.urlName)}
                />
              ) : null}
            </div>
            {section.unscanned ? (
              <p className="rounded-xl border border-line bg-void-raised px-4 py-3 text-xs text-platinum-faint">
                Not scanned yet — prices appear after the next catalog scan.
              </p>
            ) : null}
            <SyndicateTable section={section} />
          </section>
        ))
      )}
    </div>
  );
}

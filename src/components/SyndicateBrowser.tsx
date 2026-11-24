"use client";

import { useMemo, useState } from "react";
import { Check, EyeOff, RefreshCw, Zap } from "lucide-react";

import { SyndicateSyncButton } from "@/components/SyndicateSyncButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterInput, useTextFilter } from "@/components/ui/FilterInput";
import { ItemNameLink } from "@/components/ui/ItemNameLink";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import { WfmLink } from "@/components/ui/WfmLink";
import type { SyndicateSection } from "@/lib/dashboard/types";
import { SYNDICATES, syndicateSlug } from "@/lib/dashboard/syndicates";
import { formatDateTime, formatPlatinum, formatRelativeTime } from "@/lib/format";

interface LiveOverride {
  lowestSell: number | null;
  highestBuy: number | null;
  scannedAt: string;
}

interface VerifyResponse {
  ok: boolean;
  cached?: boolean;
  error?: string;
  items?: Array<{
    urlName: string;
    lowestSell: number | null;
    highestBuy: number | null;
    scannedAt: string;
  }>;
}

function FreshnessCell({ scannedAt, isLive }: { scannedAt: string | null; isLive: boolean }) {
  if (isLive) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-teal/35 bg-teal/12 px-2 py-0.5 text-[11px] font-semibold text-teal"
        title={formatDateTime(scannedAt)}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
        Live
      </span>
    );
  }
  if (!scannedAt) {
    return <span className="font-mono-num text-xs text-platinum-faint">—</span>;
  }
  const ageMs = Date.now() - new Date(scannedAt).getTime();
  const isStale = ageMs > 2 * 60 * 60 * 1000;
  return (
    <span
      className={`font-mono-num text-xs ${isStale ? "text-amber" : "text-platinum-dim"}`}
      title={formatDateTime(scannedAt)}
    >
      {formatRelativeTime(scannedAt)}
    </span>
  );
}

function SyndicateTable({
  section,
  liveUrls,
}: {
  section: SyndicateSection;
  liveUrls: ReadonlySet<string>;
}) {
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
        <TableShell minWidth="640px">
          <thead>
            <tr>
              <Th>Augment mod</Th>
              <Th>Warframe / Weapon</Th>
              <Th>Lowest sell</Th>
              <Th>Highest buy</Th>
              <Th>Updated</Th>
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
                <td className="px-3.5 py-2.5">
                  <FreshnessCell scannedAt={mod.scannedAt} isLive={liveUrls.has(mod.urlName)} />
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

function sortModsBySell(mods: SyndicateSection["mods"]): SyndicateSection["mods"] {
  return [...mods].sort((a, b) => {
    const aSell = a.lowestSell ?? -1;
    const bSell = b.lowestSell ?? -1;
    if (bSell !== aSell) return bSell - aSell;
    return a.itemName.localeCompare(b.itemName);
  });
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
  const [liveOverrides, setLiveOverrides] = useState<Record<string, LiveOverride>>({});
  const [verifyingSlug, setVerifyingSlug] = useState<string | null>(null);
  const [verifyFeedback, setVerifyFeedback] = useState<Record<string, string>>({});

  const liveUrls = useMemo(() => new Set(Object.keys(liveOverrides)), [liveOverrides]);

  const mergedSections = useMemo(() => {
    if (Object.keys(liveOverrides).length === 0) return sections;
    return sections.map((section) => {
      let touched = false;
      const mods = section.mods.map((mod) => {
        const override = liveOverrides[mod.urlName];
        if (!override) return mod;
        touched = true;
        return {
          ...mod,
          lowestSell: override.lowestSell,
          highestBuy: override.highestBuy,
          scannedAt: override.scannedAt,
        };
      });
      return touched ? { ...section, mods: sortModsBySell(mods), unscanned: false } : section;
    });
  }, [sections, liveOverrides]);

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

  async function handleVerifyTop(syndicateName: string) {
    const slug = syndicateSlug(syndicateName);
    if (verifyingSlug) return;
    setVerifyingSlug(slug);
    setVerifyFeedback((prev) => ({ ...prev, [slug]: "" }));
    try {
      const res = await fetch("/api/syndicates/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syndicate: syndicateName }),
      });
      const data = (await res.json()) as VerifyResponse;
      if (!res.ok || !data.ok) {
        setVerifyFeedback((prev) => ({
          ...prev,
          [slug]: data.error ?? "Live check failed",
        }));
        return;
      }
      const nextOverrides: Record<string, LiveOverride> = {};
      for (const item of data.items ?? []) {
        nextOverrides[item.urlName] = {
          lowestSell: item.lowestSell,
          highestBuy: item.highestBuy,
          scannedAt: item.scannedAt,
        };
      }
      setLiveOverrides((prev) => ({ ...prev, ...nextOverrides }));
      setVerifyFeedback((prev) => ({
        ...prev,
        [slug]: data.cached ? "Fresh (<60s)" : `Verified ${data.items?.length ?? 0} live`,
      }));
    } catch {
      setVerifyFeedback((prev) => ({ ...prev, [slug]: "Network error" }));
    } finally {
      setVerifyingSlug(null);
    }
  }

  const allHidden = hidden.size === SYNDICATES.length;
  const visible = mergedSections.filter((section) => !hidden.has(syndicateSlug(section.syndicate)));

  return (
    <div className="flex flex-col gap-6">
      {/* 6-Syndicate Quick Comparison Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mergedSections.map((section) => {
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
        visible.map((section) => {
          const slug = syndicateSlug(section.syndicate);
          const isVerifying = verifyingSlug === slug;
          const feedback = verifyFeedback[slug];
          return (
            <section key={section.syndicate} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-platinum">
                  {section.syndicate}
                  <span className="ml-2 text-xs font-normal text-platinum-faint">
                    {section.mods.length} augments
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {feedback ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-teal">
                      <Check size={12} />
                      {feedback}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleVerifyTop(section.syndicate)}
                    disabled={verifyingSlug !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal/35 bg-teal/10 px-3 py-1.5 text-xs font-semibold text-teal transition-colors hover:bg-teal/20 disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        Checking top 12…
                      </>
                    ) : (
                      <>
                        <Zap size={12} />
                        Verify top 12 live
                      </>
                    )}
                  </button>
                  {canSync ? (
                    <SyndicateSyncButton
                      syndicate={section.syndicate}
                      urlNames={section.mods.map((mod) => mod.urlName)}
                    />
                  ) : null}
                </div>
              </div>
              {section.unscanned ? (
                <p className="rounded-xl border border-line bg-void-raised px-4 py-3 text-xs text-platinum-faint">
                  Not scanned yet — click Verify top 12 live or wait for the next 10-minute refresh.
                </p>
              ) : null}
              <SyndicateTable section={section} liveUrls={liveUrls} />
            </section>
          );
        })
      )}
    </div>
  );
}

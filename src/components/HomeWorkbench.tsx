"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ItemNameLink } from "@/components/ui/ItemNameLink";
import { RecBadge } from "@/components/ui/RecBadge";
import { WfmLink } from "@/components/ui/WfmLink";
import type {
  DucatBoardRow,
  MarketableModRow,
  ModStashRow,
  RelicBoardRow,
  SyndicateSection,
} from "@/lib/dashboard/types";
import { formatPlatinum } from "@/lib/format";

type BenchTab = "syndicates" | "ducats" | "relics" | "mods";

const TABS: Array<{ id: BenchTab; label: string; href: string; cta: string }> = [
  { id: "syndicates", label: "Syndicates (25k)", href: "/syndicates", cta: "Full Syndicate board" },
  { id: "ducats", label: "Baro Ducats (d/p)", href: "/ducats", cta: "Full Ducats board" },
  { id: "relics", label: "Unvaulted Relics", href: "/relics", cta: "All Relics" },
  { id: "mods", label: "Don't Dissolve", href: "/mods", cta: "Manage Mod Stash" },
];

export function HomeWorkbench({
  syndicates,
  ducatJunk,
  ducatSell,
  relics,
  stashListMods,
  fodderMods,
  signedIn,
}: {
  syndicates: SyndicateSection[];
  ducatJunk: DucatBoardRow[];
  ducatSell: DucatBoardRow[];
  relics: RelicBoardRow[];
  stashListMods: ModStashRow[];
  fodderMods: MarketableModRow[];
  signedIn: boolean;
}) {
  const [tab, setTab] = useState<BenchTab>("syndicates");
  const [selectedSyn, setSelectedSyn] = useState<string>("all");

  const activeMeta = TABS.find((t) => t.id === tab) ?? TABS[0];

  const syndicateMods = (() => {
    if (selectedSyn !== "all") {
      const section = syndicates.find((s) => s.syndicate === selectedSyn);
      return (section?.mods ?? []).slice(0, 10).map((mod) => ({
        ...mod,
        syndicateLabel: section?.syndicate ?? "",
      }));
    }

    const byUrl = new Map<
      string,
      {
        urlName: string;
        itemName: string;
        compat: string | null;
        thumb: string | null;
        lowestSell: number | null;
        syndicates: string[];
      }
    >();

    for (const section of syndicates) {
      for (const mod of section.mods) {
        if (mod.lowestSell === null) continue;
        const existing = byUrl.get(mod.urlName);
        if (existing) {
          existing.syndicates.push(section.syndicate);
        } else {
          byUrl.set(mod.urlName, {
            urlName: mod.urlName,
            itemName: mod.itemName,
            compat: mod.compat,
            thumb: mod.thumb,
            lowestSell: mod.lowestSell,
            syndicates: [section.syndicate],
          });
        }
      }
    }

    return [...byUrl.values()]
      .sort((a, b) => (b.lowestSell ?? -1) - (a.lowestSell ?? -1))
      .slice(0, 6)
      .map((entry) => ({
        urlName: entry.urlName,
        itemName: entry.itemName,
        compat: entry.compat,
        thumb: entry.thumb,
        lowestSell: entry.lowestSell,
        syndicateLabel: entry.syndicates.join(" · "),
      }));
  })();

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-void-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-rail px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Farming workbench">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                  active
                    ? "bg-gold text-void"
                    : "text-platinum-dim hover:bg-void-panel hover:text-platinum"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <Link
          href={activeMeta.href}
          className="inline-flex items-center gap-1 text-xs font-medium text-gold transition-colors hover:underline"
        >
          {activeMeta.cta}
          <ArrowRight size={13} />
        </Link>
      </div>

      {tab === "syndicates" ? (
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line/70 px-4 py-2.5 sm:px-5">
            <button
              type="button"
              onClick={() => setSelectedSyn("all")}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedSyn === "all"
                  ? "border-gold/45 bg-gold/15 text-gold"
                  : "border-line bg-void-panel text-platinum-dim hover:text-platinum"
              }`}
            >
              Top across all 6
            </button>
            {syndicates.map((section) => {
              const active = selectedSyn === section.syndicate;
              return (
                <button
                  key={section.syndicate}
                  type="button"
                  onClick={() => setSelectedSyn(section.syndicate)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-gold/45 bg-gold/15 text-gold"
                      : "border-line bg-void-panel text-platinum-dim hover:text-platinum"
                  }`}
                >
                  {section.syndicate}
                </button>
              );
            })}
          </div>

          <div className="grid divide-y divide-line/70 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className="flex min-w-0 flex-col divide-y divide-line/60 px-3.5 sm:px-5">
              {selectedSyn === "all" ? (
                <div className="py-2.5 text-[11px] font-semibold tracking-wider text-platinum-faint uppercase">
                  Best 25k standing cash-ins
                </div>
              ) : null}
              {syndicateMods.slice(0, selectedSyn === "all" ? 5 : 5).map((mod) => (
                <div
                  key={`${mod.urlName}-${mod.syndicateLabel}`}
                  className="flex min-w-0 items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <ItemNameLink urlName={mod.urlName} name={mod.itemName} thumb={mod.thumb} />
                    <p className="mt-0.5 truncate pl-[42px] text-xs text-platinum-faint">
                      {mod.compat ? `${mod.compat} · ` : ""}
                      {mod.syndicateLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="font-mono-num rounded-md border border-gold/35 bg-gold/12 px-2 py-1 text-xs font-semibold text-gold">
                      {formatPlatinum(mod.lowestSell)}
                    </span>
                    <WfmLink urlName={mod.urlName} itemName={mod.itemName} />
                  </div>
                </div>
              ))}
            </div>

            {selectedSyn === "all" ? (
              <div className="flex min-w-0 flex-col divide-y divide-line/60 px-3.5 sm:px-5">
                <div className="flex items-center justify-between py-2.5 text-[11px] font-semibold tracking-wider text-platinum-faint uppercase">
                  <span>Quick Baro Ducats split</span>
                  <Link href="/ducats" className="text-gold hover:underline">
                    All tiers →
                  </Link>
                </div>
                {[...ducatJunk.slice(0, 3), ...ducatSell.slice(0, 2)].map((row) => (
                  <div
                    key={row.urlName}
                    className="flex min-w-0 items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <ItemNameLink urlName={row.urlName} name={row.itemName} thumb={row.thumb} />
                      <p className="font-mono-num mt-0.5 truncate pl-[42px] text-xs text-platinum-faint">
                        {row.ducats}d · {formatPlatinum(row.lowestSell)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="font-mono-num text-xs font-semibold text-platinum">
                        {row.ducatsPerPlat !== null ? `${row.ducatsPerPlat.toFixed(1)} d/p` : "—"}
                      </span>
                      <span className="hidden sm:inline-block">
                        <RecBadge recommendation={row.recommendation} />
                      </span>
                      <WfmLink urlName={row.urlName} itemName={row.itemName} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-w-0 flex-col divide-y divide-line/60 px-3.5 sm:px-5">
                {syndicateMods.slice(5, 10).map((mod) => (
                  <div
                    key={`${mod.urlName}-${mod.syndicateLabel}`}
                    className="flex min-w-0 items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <ItemNameLink urlName={mod.urlName} name={mod.itemName} thumb={mod.thumb} />
                      <p className="mt-0.5 truncate pl-[42px] text-xs text-platinum-faint">
                        {mod.compat ?? mod.syndicateLabel}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="font-mono-num rounded-md border border-gold/35 bg-gold/12 px-2 py-1 text-xs font-semibold text-gold">
                        {formatPlatinum(mod.lowestSell)}
                      </span>
                      <WfmLink urlName={mod.urlName} itemName={mod.itemName} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "ducats" ? (
        <div className="grid divide-y divide-line/70 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <div className="flex flex-col divide-y divide-line/60 px-4 sm:px-5">
            <div className="py-3 text-[11px] font-semibold tracking-wider text-teal uppercase">
              Best Baro Fodder (≥ 12 ducats / plat)
            </div>
            {ducatJunk.slice(0, 6).map((row) => (
              <div key={row.urlName} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <ItemNameLink urlName={row.urlName} name={row.itemName} thumb={row.thumb} />
                  <p className="font-mono-num mt-0.5 pl-[42px] text-xs text-platinum-faint">
                    {row.ducats}d · {formatPlatinum(row.lowestSell)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono-num text-sm font-semibold text-teal">
                    {row.ducatsPerPlat !== null ? `${row.ducatsPerPlat.toFixed(1)} d/p` : "—"}
                  </span>
                  <WfmLink urlName={row.urlName} itemName={row.itemName} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col divide-y divide-line/60 px-4 sm:px-5">
            <div className="py-3 text-[11px] font-semibold tracking-wider text-gold uppercase">
              Keep to Sell for Plat (&lt; 8 ducats / plat)
            </div>
            {ducatSell.slice(0, 6).map((row) => (
              <div key={row.urlName} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <ItemNameLink urlName={row.urlName} name={row.itemName} thumb={row.thumb} />
                  <p className="font-mono-num mt-0.5 pl-[42px] text-xs text-platinum-faint">
                    {row.ducats}d · {formatPlatinum(row.lowestSell)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono-num text-sm font-semibold text-gold">
                    {row.ducatsPerPlat !== null ? `${row.ducatsPerPlat.toFixed(1)} d/p` : "—"}
                  </span>
                  <WfmLink urlName={row.urlName} itemName={row.itemName} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "relics" ? (
        <div className="grid divide-y divide-line/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {[relics.slice(0, 4), relics.slice(4, 8)].map((col, idx) => (
            <div key={idx} className="flex flex-col divide-y divide-line/60 px-4 sm:px-5">
              {col.map((relic) => (
                <Link
                  key={relic.name}
                  href={`/relics?era=${encodeURIComponent(relic.era)}&vaulted=unvaulted`}
                  className="flex items-center justify-between gap-3 py-3.5 transition-colors hover:bg-void-panel/40"
                >
                  <div>
                    <div className="font-medium text-platinum">{relic.name}</div>
                    <p className="font-mono-num mt-0.5 text-xs text-platinum-faint">
                      {relic.era} · Intact {relic.intactEv !== null ? `${Math.round(relic.intactEv)}p` : "—"} ·{" "}
                      {relic.pricedDrops}/{relic.totalDrops} drops priced
                    </p>
                  </div>
                  <span className="font-mono-num rounded-md border border-gold/35 bg-gold/12 px-2.5 py-1 text-sm font-semibold text-gold">
                    {relic.radiantEv !== null ? `${Math.round(relic.radiantEv)}p EV` : "—"}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {tab === "mods" ? (
        <div className="grid divide-y divide-line/70 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <div className="flex flex-col divide-y divide-line/60 px-4 sm:px-5">
            <div className="py-3 text-[11px] font-semibold tracking-wider text-gold uppercase">
              Your Mod Stash (worth listing)
            </div>
            {stashListMods.length === 0 ? (
              <div className="py-6 text-sm text-platinum-dim">
                {signedIn ? (
                  <>
                    No stash mods worth listing yet.{" "}
                    <Link href="/mods" className="text-gold hover:underline">
                      Add excess mods →
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/login?next=/mods" className="text-gold hover:underline">
                      Sign in
                    </Link>{" "}
                    to track your own excess mods and see what to list vs dissolve.
                  </>
                )}
              </div>
            ) : (
              stashListMods.map((mod) => (
                <div key={mod.urlName} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <ItemNameLink
                      urlName={mod.urlName}
                      name={mod.itemName ?? mod.urlName}
                      thumb={mod.thumb}
                    />
                    <p className="font-mono-num mt-0.5 pl-[42px] text-xs text-platinum-faint">
                      Qty {mod.quantity} · {mod.endo ?? "—"} endo if dissolved
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono-num text-sm font-semibold text-gold">
                      {formatPlatinum(mod.lowestSell)}
                    </span>
                    <WfmLink urlName={mod.urlName} itemName={mod.itemName ?? mod.urlName} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col divide-y divide-line/60 px-4 sm:px-5">
            <div className="py-3 text-[11px] font-semibold tracking-wider text-platinum-faint uppercase">
              Casual rare drops worth listing
            </div>
            {fodderMods.slice(0, 6).map((mod) => (
              <div key={mod.urlName} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <ItemNameLink urlName={mod.urlName} name={mod.itemName} thumb={mod.thumb} />
                  <p className="font-mono-num mt-0.5 pl-[42px] text-xs text-platinum-faint">
                    {mod.rarity ?? "Mod"} · {mod.endo ?? "—"} endo
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono-num text-sm font-semibold text-gold">
                    {formatPlatinum(mod.lowestSell)}
                  </span>
                  <WfmLink urlName={mod.urlName} itemName={mod.itemName} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

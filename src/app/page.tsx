import Link from "next/link";
import type { ReactNode } from "react";

import { ItemThumb } from "@/components/ui/ItemThumb";
import { getHomeBriefing } from "@/lib/dashboard";
import { alertDetail } from "@/lib/dashboard/alertText";
import { formatPercent, formatPlatinum } from "@/lib/format";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function QueueHeader({
  title,
  href,
  label,
  tone,
}: {
  title: string;
  href: string;
  label: string;
  tone: "teal" | "amber" | "red";
}) {
  const color =
    tone === "teal" ? "text-teal" : tone === "amber" ? "text-amber" : "text-red";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className={`font-display text-sm font-semibold tracking-wide ${color}`}>{title}</h2>
      <Link href={href} className={`text-xs ${color} hover:underline`}>
        {label}
      </Link>
    </div>
  );
}

function LaneCard({
  href,
  lane,
  children,
}: {
  href: string;
  lane: "teal" | "amber" | "red";
  children: ReactNode;
}) {
  const laneClass =
    lane === "teal" ? "lane-teal" : lane === "amber" ? "lane-amber" : "lane-red";
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-sm border border-line px-3 py-2.5 transition-colors hover:border-line-strong ${laneClass}`}
    >
      {children}
    </Link>
  );
}

export default async function HomePage() {
  const [{ flips, drops, listMods, relic }, user] = await Promise.all([
    getHomeBriefing(),
    getAuthUser(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-medium tracking-[0.22em] text-teal uppercase">Today</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-platinum">
          What to do this session
        </h1>
        <p className="max-w-xl text-sm text-platinum-dim">
          Four jobs. Color is the type: teal to flip, amber to list, red when price dropped.
          Flips are in-game listings versus the next in-game ask.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <QueueHeader title="Flip these" href="/flips" label="All flips" tone="teal" />
          {flips.length === 0 ? (
            <p className="lane-teal rounded-sm border border-line px-4 py-5 text-sm text-platinum-dim">
              No flips clear the bar yet. Check again after a scan.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {flips.map((row) => (
                <li key={row.urlName}>
                  <LaneCard href={`/items/${row.urlName}`} lane="teal">
                    <ItemThumb thumb={row.thumb} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-platinum">{row.itemName}</span>
                      <span className="font-mono-num text-xs text-platinum-dim">
                        {formatPlatinum(row.spread)} spread
                      </span>
                    </span>
                    <span className="font-mono-num text-base font-medium text-teal">
                      {formatPercent(row.roiPct)}
                    </span>
                  </LaneCard>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <QueueHeader title="Don't dissolve" href="/mods" label="All mods" tone="amber" />
          {listMods.length === 0 ? (
            <p className="lane-amber rounded-sm border border-line px-4 py-5 text-sm text-platinum-dim">
              {user
                ? "Nothing in your stash is worth listing yet. Add excess rares on Mods."
                : "Sign in and add excess rares on Mods to see list recs here."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {listMods.map((row) => (
                <li key={row.urlName}>
                  <LaneCard href={`/items/${row.urlName}`} lane="amber">
                    <ItemThumb thumb={row.thumb} />
                    <span className="min-w-0 flex-1 truncate text-sm text-platinum">
                      {row.itemName}
                    </span>
                    <span className="font-mono-num text-base font-medium text-amber">
                      {formatPlatinum(row.lowestSell)}
                    </span>
                  </LaneCard>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <QueueHeader title="Price drop" href="/alerts" label="All alerts" tone="red" />
          {drops.length === 0 ? (
            <p className="lane-red rounded-sm border border-line px-4 py-5 text-sm text-platinum-dim">
              No price drops fired today.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {drops.map((row) => (
                <li key={row.id}>
                  <LaneCard href={`/items/${row.urlName}`} lane="red">
                    <ItemThumb thumb={row.thumb} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-platinum">{row.itemName}</span>
                      <span className="font-mono-num text-xs text-red">{alertDetail(row)}</span>
                    </span>
                  </LaneCard>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <QueueHeader title="Run this relic" href="/relics" label="All relics" tone="teal" />
          {relic === null ? (
            <p className="lane-teal rounded-sm border border-line px-4 py-5 text-sm text-platinum-dim">
              No unvaulted relic values yet. Sync part prices on Relics.
            </p>
          ) : (
            <LaneCard href="/relics" lane="teal">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-platinum">{relic.name}</span>
                <span className="text-xs text-platinum-dim">
                  {relic.era}
                  {relic.vaulted ? " · vaulted" : " · available"}
                </span>
              </span>
              <span className="font-mono-num text-lg font-medium text-teal">
                {relic.radiantEv !== null
                  ? `${formatPlatinum(Math.round(relic.radiantEv))} EV`
                  : "—"}
              </span>
            </LaneCard>
          )}
        </section>
      </div>
    </div>
  );
}

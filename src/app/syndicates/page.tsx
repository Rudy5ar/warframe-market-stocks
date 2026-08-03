import Link from "next/link";
import { ExternalLink, EyeOff } from "lucide-react";

import { SyndicateSyncButton } from "@/components/SyndicateSyncButton";
import { getSyndicateAugments } from "@/lib/dashboard";
import type { SyndicateSection } from "@/lib/dashboard";
import { SYNDICATES, syndicateSlug } from "@/lib/dashboard/syndicates";
import { formatDateTime, formatPercent, formatPlatinum, wfmItemUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Syndicate augments — WF Stocks",
};

function filterHref(hidden: ReadonlySet<string>, slug: string): string {
  const next = new Set(hidden);
  if (next.has(slug)) {
    next.delete(slug);
  } else {
    next.add(slug);
  }
  return next.size === 0 ? "/syndicates" : `/syndicates?hide=${[...next].join(",")}`;
}

function SyndicateFilter({ hidden }: { hidden: ReadonlySet<string> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-platinum-faint">Show:</span>
      {SYNDICATES.map((name) => {
        const slug = syndicateSlug(name);
        const isHidden = hidden.has(slug);
        return (
          <Link
            key={slug}
            href={filterHref(hidden, slug)}
            aria-pressed={!isHidden}
            title={isHidden ? `Show ${name}` : `Hide ${name}`}
            className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
              isHidden
                ? "border-line text-platinum-faint line-through hover:text-platinum-dim"
                : "border-teal-dim bg-teal-dim/10 text-teal hover:bg-teal-dim/20"
            }`}
          >
            {isHidden ? <EyeOff size={12} /> : null}
            {name}
          </Link>
        );
      })}
    </div>
  );
}

function SyndicateTable({ section }: { section: SyndicateSection }) {
  return (
    <div className="scroll-thin overflow-x-auto rounded border border-line">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-platinum-faint">
            <th className="px-3 py-2 font-medium">Mod</th>
            <th className="px-3 py-2 font-medium">For</th>
            <th className="px-3 py-2 font-medium">Sell</th>
            <th className="px-3 py-2 font-medium">Buy</th>
            <th className="px-3 py-2 font-medium">Spread</th>
            <th className="px-3 py-2 font-medium">ROI</th>
            <th className="px-3 py-2 font-medium">Scanned</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {section.mods.map((mod) => (
            <tr
              key={mod.urlName}
              className="border-b border-line last:border-b-0 transition-colors hover:bg-void-raised"
            >
              <td className="px-3 py-2">
                <Link href={`/items/${mod.urlName}`} className="text-platinum hover:text-teal">
                  {mod.itemName}
                </Link>
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
              <td className="font-mono-num px-3 py-2 text-teal">
                {formatPercent(mod.roiPct)}
              </td>
              <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                {formatDateTime(mod.scannedAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <a
                  href={wfmItemUrl(mod.urlName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${mod.itemName} on warframe.market`}
                  className="text-platinum-faint transition-colors hover:text-teal"
                >
                  <ExternalLink size={14} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function SyndicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ hide?: string }>;
}) {
  const { hide } = await searchParams;
  const knownSlugs = new Set(SYNDICATES.map(syndicateSlug));
  const hidden = new Set(
    (hide ?? "")
      .split(",")
      .map((slug) => slug.trim())
      .filter((slug) => knownSlugs.has(slug)),
  );

  const sections = await getSyndicateAugments();
  const noData = sections.every((section) => section.mods.length === 0);
  const visible = sections.filter((section) => !hidden.has(syndicateSlug(section.syndicate)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-platinum">Syndicate augments</h1>
        <p className="text-sm text-platinum-faint">
          Augment mods from the six base syndicates, sorted by current sell price — best
          platinum for leftover standing first. Prices come from scan snapshots; &ldquo;Sync
          all&rdquo; re-scans every mod of a syndicate live (about a minute per syndicate).
        </p>
      </div>

      <SyndicateFilter hidden={hidden} />

      {noData ? (
        <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
          No syndicate augments matched in the item catalog yet. Run{" "}
          <code className="font-mono-num">sync-items</code> first so the manifest is populated.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
          All syndicates are hidden. Toggle one back on above.
        </p>
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
              <p className="rounded border border-line bg-void-raised px-4 py-3 text-xs text-platinum-faint">
                Not scanned yet — prices appear once the scan cycle reaches these mods, or
                press &ldquo;Sync all&rdquo;.
              </p>
            ) : null}
            <SyndicateTable section={section} />
          </section>
        ))
      )}
    </div>
  );
}

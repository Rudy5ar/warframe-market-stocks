import { SyndicateBrowser } from "@/components/SyndicateBrowser";
import { getSyndicateAugments } from "@/lib/dashboard";
import { SYNDICATES, syndicateSlug } from "@/lib/dashboard/syndicates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Syndicate augments — WF Stocks",
};

export default async function SyndicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ hide?: string }>;
}) {
  const { hide } = await searchParams;
  const knownSlugs = new Set(SYNDICATES.map(syndicateSlug));
  const initialHidden = (hide ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => knownSlugs.has(slug));

  const sections = await getSyndicateAugments();
  const noData = sections.every((section) => section.mods.length === 0);

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

      {noData ? (
        <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
          No syndicate augments matched in the item catalog yet. Run{" "}
          <code className="font-mono-num">sync-items</code> first so the manifest is populated.
        </p>
      ) : (
        <SyndicateBrowser sections={sections} initialHidden={initialHidden} />
      )}
    </div>
  );
}

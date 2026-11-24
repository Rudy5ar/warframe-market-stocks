import { SyndicateBrowser } from "@/components/SyndicateBrowser";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { isAdminUser } from "@/lib/auth/policy";
import { getSyndicateAugments } from "@/lib/dashboard";
import { SYNDICATES, syndicateSlug } from "@/lib/dashboard/syndicates";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Syndicates",
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

  const [sections, user] = await Promise.all([getSyndicateAugments(), getAuthUser()]);
  const canSync = isAdminUser(user);
  const noData = sections.every((section) => section.mods.length === 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Syndicate augments"
        description="All 198 base syndicate augments auto-refreshed every 30 minutes via live top orders, sorted by current in-game sell. Click Verify top 12 live to re-check a syndicate in 4 seconds."
      />

      {noData ? (
        <EmptyState>
          No syndicate augments in the catalog yet. Wait until the item list is synced, then
          refresh.
        </EmptyState>
      ) : (
        <SyndicateBrowser sections={sections} initialHidden={initialHidden} canSync={canSync} />
      )}
    </div>
  );
}

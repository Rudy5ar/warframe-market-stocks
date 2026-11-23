import { SyndicateBrowser } from "@/components/SyndicateBrowser";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { isAdminUser } from "@/lib/auth/policy";
import { getSyndicateAugments } from "@/lib/dashboard";
import { SYNDICATES, syndicateSlug } from "@/lib/dashboard/syndicates";
import { getAuthUser } from "@/lib/supabase/server";

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

  const [sections, user] = await Promise.all([getSyndicateAugments(), getAuthUser()]);
  const canSync = isAdminUser(user);
  const noData = sections.every((section) => section.mods.length === 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Syndicate augments"
        description="Augment mods from the six base syndicates, sorted by current sell — leftover standing first. Prices come from scheduled scans."
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

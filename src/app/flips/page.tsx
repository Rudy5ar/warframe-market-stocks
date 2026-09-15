import { OpportunitiesTable } from "@/components/OpportunitiesTable";
import { FilterChip } from "@/components/ui/FilterChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTopOpportunities } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Flips — WF Stocks",
};

export default async function FlipsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: sortRaw } = await searchParams;
  const sort = sortRaw === "spread" ? "spread" : "roi";
  const rows = await getTopOpportunities(80, sort);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flips"
        description="Items clearing the spread and ROI bar, ranked for this session."
      />
      <div className="flex flex-wrap gap-2">
        <FilterChip href="/flips" active={sort === "roi"}>
          Highest ROI
        </FilterChip>
        <FilterChip href="/flips?sort=spread" active={sort === "spread"}>
          Highest spread
        </FilterChip>
      </div>
      <OpportunitiesTable rows={rows} />
    </div>
  );
}

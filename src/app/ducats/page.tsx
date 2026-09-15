import { CatalogSyncButton } from "@/components/CatalogSyncButton";
import { DucatsTable } from "@/components/DucatsTable";
import { FilterChip } from "@/components/ui/FilterChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAllDucatUrlNames, getDucatBoard } from "@/lib/dashboard";
import type { DucatSort } from "@/lib/dashboard/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ducats — WF Stocks",
};

export default async function DucatsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: sortRaw } = await searchParams;
  const sort: DucatSort = sortRaw === "sell" ? "sell" : "plat_per_ducat";
  const rows = await getDucatBoard(sort, 100);
  const syncUrls = getAllDucatUrlNames().slice(0, 80);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ducat efficiency"
        description="Compare market sell to fixed ducat value. Low plat/ducat → junk at Baro; high → sell on warframe.market. Live Baro shop is not tracked."
        actions={<CatalogSyncButton label="prices" urlNames={syncUrls} />}
      />

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/ducats?sort=plat_per_ducat" active={sort === "plat_per_ducat"}>
          Junk candidates
        </FilterChip>
        <FilterChip href="/ducats?sort=sell" active={sort === "sell"}>
          Highest sell
        </FilterChip>
      </div>

      <DucatsTable rows={rows} />
    </div>
  );
}

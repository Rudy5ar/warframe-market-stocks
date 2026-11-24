import { CatalogSyncButton } from "@/components/CatalogSyncButton";
import { DucatsTable } from "@/components/DucatsTable";
import { FilterChip } from "@/components/ui/FilterChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { isAdminUser } from "@/lib/auth/policy";
import { DUCAT_TIERS, getAllDucatUrlNames, getDucatBoard } from "@/lib/dashboard";
import type { DucatSort } from "@/lib/dashboard/types";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Baro Ducats",
};

function ducatsHref(sort: DucatSort, tier: number | null): string {
  const sp = new URLSearchParams();
  if (sort !== "ducats_per_plat") sp.set("sort", sort);
  if (tier !== null) sp.set("tier", String(tier));
  const q = sp.toString();
  return q ? `/ducats?${q}` : "/ducats";
}

export default async function DucatsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; tier?: string }>;
}) {
  const params = await searchParams;
  const sort: DucatSort =
    params.sort === "sell_plat"
      ? "sell_plat"
      : params.sort === "highest_plat" || params.sort === "sell"
        ? "highest_plat"
        : "ducats_per_plat";

  const parsedTier = params.tier ? Number.parseInt(params.tier, 10) : NaN;
  const tier = (DUCAT_TIERS as readonly number[]).includes(parsedTier) ? parsedTier : null;

  const [rows, user] = await Promise.all([getDucatBoard(sort, 150, tier), getAuthUser()]);
  const canSync = isAdminUser(user);
  const syncUrls = getAllDucatUrlNames().slice(0, 80);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Baro Ducats"
        description="Ranked by ducats per platinum (d/p). Parts at 12+ d/p are clean Baro fodder; under 8 d/p are worth selling for platinum instead."
        actions={canSync ? <CatalogSyncButton label="prices" urlNames={syncUrls} /> : undefined}
      />

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-platinum-faint uppercase">
            View
          </span>
          <FilterChip href={ducatsHref("ducats_per_plat", tier)} active={sort === "ducats_per_plat"}>
            Best Baro junk (high d/p)
          </FilterChip>
          <FilterChip href={ducatsHref("sell_plat", tier)} active={sort === "sell_plat"}>
            Sell for plat (low d/p)
          </FilterChip>
          <FilterChip href={ducatsHref("highest_plat", tier)} active={sort === "highest_plat"}>
            Highest plat
          </FilterChip>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-platinum-faint uppercase">
            Tier
          </span>
          <FilterChip href={ducatsHref(sort, null)} active={tier === null}>
            All tiers
          </FilterChip>
          {DUCAT_TIERS.map((t) => (
            <FilterChip key={t} href={ducatsHref(sort, t)} active={tier === t}>
              {t}d
            </FilterChip>
          ))}
        </div>
      </div>

      <DucatsTable rows={rows} />
    </div>
  );
}

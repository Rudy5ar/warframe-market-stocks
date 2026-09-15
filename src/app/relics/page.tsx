import { CatalogSyncButton } from "@/components/CatalogSyncButton";
import { RelicsTable } from "@/components/RelicsTable";
import { FilterChip } from "@/components/ui/FilterChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAllRelicPartUrlNames, getRelicBoard } from "@/lib/dashboard";
import { RELIC_ERAS } from "@/lib/dashboard/relics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Relics — WF Stocks",
};

function filterHref(params: {
  era?: string;
  vaulted?: string;
  sort?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.era && params.era !== "all") sp.set("era", params.era);
  if (params.vaulted && params.vaulted !== "all") sp.set("vaulted", params.vaulted);
  if (params.sort && params.sort !== "radiant") sp.set("sort", params.sort);
  const q = sp.toString();
  return q ? `/relics?${q}` : "/relics";
}

export default async function RelicsPage({
  searchParams,
}: {
  searchParams: Promise<{ era?: string; vaulted?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const era = params.era ?? "all";
  const vaulted =
    params.vaulted === "vaulted" || params.vaulted === "unvaulted" ? params.vaulted : "all";
  const sort = params.sort === "intact" ? "intact" : "radiant";

  const rows = await getRelicBoard({
    era: era === "all" ? null : era,
    vaulted,
    sort,
    limit: 80,
  });

  const allParts = getAllRelicPartUrlNames();
  const syncUrls = allParts.slice(0, 120);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relic value"
        description="Expected platinum from Intact / Radiant openings using current lowest sells. Run the high-EV relics; sync part prices if many rows show dashes."
        actions={<CatalogSyncButton label="parts" urlNames={syncUrls} />}
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center text-[11px] tracking-wider text-platinum-faint uppercase">
            Era
          </span>
          <FilterChip href={filterHref({ era: "all", vaulted, sort })} active={era === "all"}>
            All
          </FilterChip>
          {RELIC_ERAS.map((e) => (
            <FilterChip
              key={e}
              href={filterHref({ era: e, vaulted, sort })}
              active={era === e}
            >
              {e}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center text-[11px] tracking-wider text-platinum-faint uppercase">
            Vault
          </span>
          {(
            [
              ["all", "All"],
              ["unvaulted", "Available"],
              ["vaulted", "Vaulted"],
            ] as const
          ).map(([value, label]) => (
            <FilterChip
              key={value}
              href={filterHref({ era, vaulted: value, sort })}
              active={vaulted === value}
            >
              {label}
            </FilterChip>
          ))}
          <span className="self-center text-[11px] tracking-wider text-platinum-faint uppercase">
            Sort
          </span>
          <FilterChip
            href={filterHref({ era, vaulted, sort: "radiant" })}
            active={sort === "radiant"}
          >
            Radiant EV
          </FilterChip>
          <FilterChip
            href={filterHref({ era, vaulted, sort: "intact" })}
            active={sort === "intact"}
          >
            Intact EV
          </FilterChip>
        </div>
      </div>

      <RelicsTable rows={rows} />
    </div>
  );
}

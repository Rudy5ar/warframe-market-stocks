import { DealsTable } from "@/components/DealsTable";
import { FilterChip } from "@/components/ui/FilterChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketDeals } from "@/lib/dashboard";
import type { DealMode } from "@/lib/dashboard/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deals",
};

function dealsHref(mode: DealMode, minVol: number): string {
  const sp = new URLSearchParams();
  if (mode !== "live") sp.set("mode", mode);
  if (minVol !== 5) sp.set("vol", String(minVol));
  const q = sp.toString();
  return q ? `/flips?${q}` : "/flips";
}

export default async function FlipsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; sort?: string; vol?: string }>;
}) {
  const params = await searchParams;
  const mode: DealMode =
    params.mode === "cheap"
      ? "cheap"
      : params.mode === "spike"
        ? "spike"
        : params.mode === "spread" || params.sort === "spread"
          ? "spread"
          : "live";
  const minVol = params.vol === "15" ? 15 : params.vol === "1" ? 1 : 5;
  const rows = await getMarketDeals(mode, 80, minVol);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Market deals"
        description="Live just-posted in-game listings (< 60s) compared against 48h medians with 1-click whisper copy, plus broader catalog bargains and spikes."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip href={dealsHref("live", minVol)} active={mode === "live"}>
            Live right now (&lt; 60s)
          </FilterChip>
          <FilterChip href={dealsHref("cheap", minVol)} active={mode === "cheap"}>
            Cheap (48h avg)
          </FilterChip>
          <FilterChip href={dealsHref("spike", minVol)} active={mode === "spike"}>
            Spiking (Sell high)
          </FilterChip>
          <FilterChip href={dealsHref("spread", minVol)} active={mode === "spread"}>
            Ask spreads
          </FilterChip>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-platinum-faint uppercase">
            48h Vol
          </span>
          <FilterChip href={dealsHref(mode, 5)} active={minVol === 5}>
            5+
          </FilterChip>
          <FilterChip href={dealsHref(mode, 15)} active={minVol === 15}>
            15+ liquid
          </FilterChip>
          <FilterChip href={dealsHref(mode, 1)} active={minVol === 1}>
            1+ all
          </FilterChip>
        </div>
      </div>

      <DealsTable rows={rows} mode={mode} />
    </div>
  );
}

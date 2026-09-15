import {
  AddModStashForm,
  BulkAddModStashForm,
} from "@/components/ModStashForms";
import { DiscoveryTable, StashTable } from "@/components/ModsTables";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketableMods, getModStash } from "@/lib/dashboard";
import { DEFAULT_MIN_MOD_SELL_PLAT } from "@/lib/market";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Don't dissolve — WF Stocks",
};

export default async function ModsPage() {
  const [stash, marketable] = await Promise.all([getModStash(), getMarketableMods(50)]);
  const minSell = Number.parseFloat(process.env.MIN_MOD_SELL_PLAT ?? "") || DEFAULT_MIN_MOD_SELL_PLAT;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Don't dissolve"
        description={`Track excess mods and see which are worth listing instead of dissolving for endo. List if sell is at least ${minSell}p.`}
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold text-platinum">Your stash</h2>
        <AddModStashForm />
        <BulkAddModStashForm />
        <StashTable rows={stash} />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-platinum">
            Casual fodder (top by sell)
          </h2>
          <p className="text-sm text-platinum-faint">
            Vault / nightmare / loot / bounty-set rares you usually dissolve — ranked by current
            sell so the ones worth listing float up. Augments stay on Syndicates.
          </p>
        </div>
        <DiscoveryTable rows={marketable} />
      </section>
    </div>
  );
}

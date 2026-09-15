import {
  AddModStashForm,
  BulkAddModStashForm,
} from "@/components/ModStashForms";
import { DiscoveryTable, StashTable } from "@/components/ModsTables";
import { PageHeader } from "@/components/ui/PageHeader";
import { SignInHint } from "@/components/ui/SignInHint";
import { getMarketableMods, getModStash } from "@/lib/dashboard";
import { DEFAULT_MIN_MOD_SELL_PLAT } from "@/lib/market";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Don't dissolve — WF Stocks",
};

export default async function ModsPage() {
  const user = await getAuthUser();
  const [stash, marketable] = await Promise.all([
    user ? getModStash() : Promise.resolve([]),
    getMarketableMods(50),
  ]);
  const minSell = Number.parseFloat(process.env.MIN_MOD_SELL_PLAT ?? "") || DEFAULT_MIN_MOD_SELL_PLAT;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Don't dissolve"
        description={`Track excess mods and see which are worth listing instead of dissolving for endo. List if sell is at least ${minSell}p.`}
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold text-platinum">Your stash</h2>
        {user ? (
          <>
            <AddModStashForm />
            <BulkAddModStashForm />
            <StashTable rows={stash} />
          </>
        ) : (
          <SignInHint next="/mods">to keep a private mod stash.</SignInHint>
        )}
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

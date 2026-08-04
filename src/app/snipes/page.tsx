import Link from "next/link";

import { SnipesTable } from "@/components/SnipesTable";
import { getSnipes } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Snipes — WF Stocks",
};

export default async function SnipesPage() {
  const rows = await getSnipes(50);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-platinum">Snipes</h1>
        <p className="text-sm text-platinum-faint">
          Items whose lowest sell is below the 48h median — buy now and relist nearer the
          median. Filtered to a minimum 48h volume so dead listings stay out.
        </p>
      </div>
      <SnipesTable rows={rows} />
      <p className="text-xs text-platinum-faint">
        Thresholds follow <code className="font-mono-num">PRICE_DROP_FACTOR</code> and{" "}
        <code className="font-mono-num">MIN_SNIPE_VOLUME</code>.{" "}
        <Link href="/alerts" className="text-teal hover:underline">
          Price-drop alerts
        </Link>{" "}
        use the same gates.
      </p>
    </div>
  );
}

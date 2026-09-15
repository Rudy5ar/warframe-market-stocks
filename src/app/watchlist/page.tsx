import { AddWatchlistForm } from "@/components/WatchlistForms";
import { WatchlistTable } from "@/components/WatchlistTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { getWatchlist } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Watchlist — WF Stocks",
};

export default async function WatchlistPage() {
  const rows = await getWatchlist();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Watchlist"
        description="Pinned items are scanned first each cycle, ahead of the catalog rotation."
      />
      <AddWatchlistForm />
      <WatchlistTable rows={rows} />
    </div>
  );
}

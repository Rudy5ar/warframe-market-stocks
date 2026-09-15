import { AddWatchlistForm } from "@/components/WatchlistForms";
import { WatchlistTable } from "@/components/WatchlistTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SignInHint } from "@/components/ui/SignInHint";
import { getWatchlist } from "@/lib/dashboard";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Watchlist — WF Stocks",
};

export default async function WatchlistPage() {
  const user = await getAuthUser();
  const rows = user ? await getWatchlist() : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Watchlist"
        description="Pinned items are scanned first each cycle, ahead of the catalog rotation. Pins stay on your account."
      />
      {user ? (
        <>
          <AddWatchlistForm />
          <WatchlistTable rows={rows} />
        </>
      ) : (
        <SignInHint next="/watchlist">to keep a private watchlist.</SignInHint>
      )}
    </div>
  );
}

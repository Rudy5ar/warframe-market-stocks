import { AddWatchlistForm } from "@/components/WatchlistForms";
import { WatchlistTable } from "@/components/WatchlistTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SignInHint } from "@/components/ui/SignInHint";
import { MAX_WATCHLIST_PINS } from "@/lib/config/limits";
import { getWatchlist } from "@/lib/dashboard";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Watchlist",
};

export default async function WatchlistPage() {
  const user = await getAuthUser();
  const rows = user ? await getWatchlist() : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Watchlist"
        description={`Pinned items are scanned first each cycle, ahead of the catalog rotation. Up to ${MAX_WATCHLIST_PINS} pins per account.`}
        actions={
          user ? (
            <span className="font-mono-num text-xs text-platinum-faint">
              {rows.length} / {MAX_WATCHLIST_PINS} pins
            </span>
          ) : undefined
        }
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

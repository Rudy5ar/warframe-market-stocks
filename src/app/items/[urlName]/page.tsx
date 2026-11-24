import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { AlertsTable } from "@/components/AlertsList";
import { WatchlistToggleButton } from "@/components/WatchlistForms";
import { CopyWhisperButton } from "@/components/ui/CopyWhisperButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemPreviewThumb } from "@/components/ui/ItemPreviewThumb";
import { Sparkline } from "@/components/ui/Sparkline";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import { getItemDetail } from "@/lib/dashboard";
import {
  formatDateTime,
  formatItemName,
  formatPlatinum,
  formatRelativeTime,
  formatVolume,
  wfmItemUrl,
} from "@/lib/format";
import { nextSellPrice } from "@/lib/market/spread";
import { createServiceClient, getAuthUser } from "@/lib/supabase/server";
import { buildWfmWhisper, getLiveTopOrders } from "@/lib/wfm/live";

export const dynamic = "force-dynamic";

interface ItemPageProps {
  params: Promise<{ urlName: string }>;
}

const STALE_SNAPSHOT_MS = 10 * 60 * 1000;

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const { urlName } = await params;
  const normalized = urlName.trim().toLowerCase();
  const [item, liveTop, user] = await Promise.all([
    getItemDetail(normalized),
    getLiveTopOrders(normalized),
    getAuthUser(),
  ]);

  if (!item) {
    notFound();
  }

  const liveIngameSells = (liveTop?.sell ?? []).filter((o) => o.user.status === "ingame");
  const liveIngameBuys = (liveTop?.buy ?? []).filter((o) => o.user.status === "ingame");
  const liveLowestSell = liveIngameSells[0]?.platinum ?? liveTop?.sell[0]?.platinum ?? item.lowestSell;
  const liveNextSell = liveIngameSells[1]?.platinum ?? null;
  const liveHighestBuy = liveIngameBuys[0]?.platinum ?? liveTop?.buy[0]?.platinum ?? item.highestBuy;
  const liveSpread =
    liveLowestSell !== null && liveNextSell !== null ? liveNextSell - liveLowestSell : item.spread;

  // Keep Supabase fresh whenever a viewed item's stored snapshot is >10 min old.
  const snapshotAgeMs = item.scannedAt
    ? Date.now() - new Date(item.scannedAt).getTime()
    : Number.POSITIVE_INFINITY;
  if (item.exists && liveTop && liveIngameSells.length > 0 && snapshotAgeMs > STALE_SNAPSHOT_MS) {
    const roiPct =
      liveLowestSell && liveSpread !== null && liveLowestSell > 0
        ? (liveSpread / liveLowestSell) * 100
        : null;
    const payload = {
      url_name: item.urlName,
      lowest_sell: liveLowestSell,
      highest_buy: liveHighestBuy,
      spread: liveSpread,
      roi_pct: roiPct,
      median_48h: item.median48h,
      volume_48h: item.volume48h,
      scanned_at: liveTop.fetchedAt,
    };
    after(async () => {
      const supabase = createServiceClient();
      const { error } = await supabase
        .from("item_snapshots")
        .upsert(payload, { onConflict: "url_name" });
      if (error) {
        console.error(`[item-page] snapshot refresh failed for ${item.urlName}: ${error.message}`);
      }
    });
  }

  const diffPct =
    liveLowestSell !== null && item.median48h !== null && item.median48h > 0
      ? Math.round(((liveLowestSell - item.median48h) / item.median48h) * 100)
      : null;

  const stats: Array<{ label: string; value: string; tone?: "teal" | "gold" | "red" }> = [
    {
      label: liveTop ? "Live sell (in-game)" : "Lowest sell",
      value: formatPlatinum(liveLowestSell),
      tone: "gold",
    },
    {
      label: "48h median",
      value: item.median48h !== null ? formatPlatinum(Math.round(item.median48h)) : "—",
    },
    {
      label: "vs 48h avg",
      value: diffPct !== null ? `${diffPct > 0 ? "+" : ""}${diffPct}%` : "—",
      tone:
        diffPct !== null
          ? diffPct <= -10
            ? "teal"
            : diffPct >= 15
              ? "red"
              : undefined
          : undefined,
    },
    { label: "Highest buy", value: formatPlatinum(liveHighestBuy) },
    { label: "Next ask spread", value: formatPlatinum(liveSpread) },
    { label: "48h volume", value: formatVolume(item.volume48h) },
  ];

  const sparkValues = [...item.history].reverse().map((point) => point.lowestSell);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-4">
          <ItemPreviewThumb
            urlName={item.urlName}
            itemName={item.itemName}
            thumb={item.thumb}
            size={64}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-platinum">
                {item.itemName}
              </h1>
              {liveTop ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/35 bg-teal/12 px-2.5 py-0.5 text-[11px] font-semibold text-teal">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
                  Live orders
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
              {!item.exists ? (
                <span className="tracking-wide text-amber uppercase">Not yet in catalog</span>
              ) : (
                <a
                  href={wfmItemUrl(item.urlName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-gold hover:underline"
                >
                  Open on warframe.market
                  <ExternalLink size={12} />
                </a>
              )}
              <span className="text-platinum-faint">Click picture to inspect full card</span>
            </div>
          </div>
        </div>
        {user ? (
          <WatchlistToggleButton urlName={item.urlName} isWatchlisted={item.isWatchlisted} />
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(`/items/${item.urlName}`)}`}
            className="rounded-lg border border-gold/40 bg-gold/12 px-3.5 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Sign in to pin
          </Link>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-line bg-void-raised px-3.5 py-3"
            >
              <div className="text-[11px] font-medium tracking-wider text-platinum-faint uppercase">
                {stat.label}
              </div>
              <div
                className={`font-mono-num mt-1 text-lg font-semibold ${
                  stat.tone === "teal"
                    ? "text-teal"
                    : stat.tone === "gold"
                      ? "text-gold"
                      : stat.tone === "red"
                        ? "text-red"
                        : "text-platinum"
                }`}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-between gap-2 rounded-xl border border-line bg-void-raised px-4 py-3">
          <span className="text-[11px] font-medium tracking-wider text-platinum-faint uppercase">
            Recent price curve
          </span>
          {sparkValues.filter((v) => v !== null).length >= 2 ? (
            <Sparkline values={sparkValues} className="h-10 w-full text-gold" />
          ) : (
            <span className="text-xs text-platinum-faint">Needs 2+ scans</span>
          )}
        </div>
      </div>

      {/* Live Sellers Ladder */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-platinum">
            Live sellers on warframe.market
          </h2>
          {liveTop ? (
            <span className="font-mono-num text-xs text-platinum-faint">
              Fetched {formatRelativeTime(liveTop.fetchedAt)} (60s cache)
            </span>
          ) : null}
        </div>
        {!liveTop || liveTop.sell.length === 0 ? (
          <EmptyState>No online sell orders found right now on warframe.market.</EmptyState>
        ) : (
          <TableShell minWidth="560px">
            <thead>
              <tr>
                <Th>Seller</Th>
                <Th>Status</Th>
                <Th>Price</Th>
                <Th>Rank</Th>
                <Th>Qty</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {liveTop.sell.map((order) => {
                const isIngame = order.user.status === "ingame";
                const whisper = buildWfmWhisper(
                  order.user.ingameName,
                  item.itemName,
                  order.platinum,
                  order.rank,
                );
                return (
                  <Tr key={order.id}>
                    <td className="px-3.5 py-2.5 font-medium text-platinum">
                      {order.user.ingameName}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                          isIngame
                            ? "border-teal/35 bg-teal/15 text-teal"
                            : "border-gold/35 bg-gold/12 text-gold"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isIngame ? "bg-teal" : "bg-gold"}`}
                          aria-hidden
                        />
                        {isIngame ? "In game" : "Online (site)"}
                      </span>
                    </td>
                    <td className="font-mono-num px-3.5 py-2.5 font-semibold text-gold">
                      {formatPlatinum(order.platinum)}
                    </td>
                    <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                      {order.rank !== null ? `R${order.rank}` : "—"}
                    </td>
                    <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                      {order.quantity}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <CopyWhisperButton whisper={whisper} compact />
                    </td>
                  </Tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold text-platinum">Scan history</h2>
        {item.history.length === 0 ? (
          <EmptyState>No history recorded yet.</EmptyState>
        ) : (
          <TableShell minWidth="680px">
            <thead>
              <tr>
                <Th>Scanned</Th>
                <Th>Lowest sell</Th>
                <Th>Next ask</Th>
                <Th>Highest buy</Th>
                <Th>Spread</Th>
                <Th>Median 48h</Th>
                <Th>Vol 48h</Th>
              </tr>
            </thead>
            <tbody>
              {item.history.map((point) => (
                <Tr key={point.scannedAt}>
                  <td className="font-mono-num px-3.5 py-2.5 text-xs text-platinum-faint">
                    {formatDateTime(point.scannedAt)}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 font-semibold text-gold">
                    {formatPlatinum(point.lowestSell)}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                    {formatPlatinum(nextSellPrice(point.lowestSell, point.spread))}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                    {formatPlatinum(point.highestBuy)}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-platinum">
                    {formatPlatinum(point.spread)}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                    {formatPlatinum(point.median48h)}
                  </td>
                  <td className="font-mono-num px-3.5 py-2.5 text-platinum-dim">
                    {formatVolume(point.volume48h)}
                  </td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold text-platinum">Recent alerts</h2>
        <AlertsTable rows={item.alerts} />
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: ItemPageProps) {
  const { urlName } = await params;
  return { title: formatItemName(urlName) };
}

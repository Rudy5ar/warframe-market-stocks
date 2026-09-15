import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AlertsTable } from "@/components/AlertsList";
import { WatchlistToggleButton } from "@/components/WatchlistForms";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemThumb } from "@/components/ui/ItemThumb";
import { Sparkline } from "@/components/ui/Sparkline";
import { TableShell, Th, Tr } from "@/components/ui/TableShell";
import { getItemDetail } from "@/lib/dashboard";
import {
  formatDateTime,
  formatItemName,
  formatPercent,
  formatPlatinum,
  formatVolume,
  wfmItemUrl,
} from "@/lib/format";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ItemPageProps {
  params: Promise<{ urlName: string }>;
}

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const { urlName } = await params;
  const [item, user] = await Promise.all([getItemDetail(urlName), getAuthUser()]);

  if (!item) {
    notFound();
  }

  const stats: Array<{ label: string; value: string; tone?: "teal" | "amber" }> = [
    { label: "Lowest sell", value: formatPlatinum(item.lowestSell) },
    { label: "Highest buy", value: formatPlatinum(item.highestBuy) },
    { label: "Spread", value: formatPlatinum(item.spread), tone: "teal" },
    { label: "ROI", value: formatPercent(item.roiPct), tone: "teal" },
    { label: "Median 48h", value: formatPlatinum(item.median48h) },
    { label: "Volume 48h", value: formatVolume(item.volume48h), tone: "amber" },
  ];

  const sparkValues = [...item.history].reverse().map((point) => point.lowestSell);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ItemThumb thumb={item.thumb} size={72} />
          <div>
            <div className="mb-2 h-0.5 w-10 bg-teal" aria-hidden />
            <h1 className="font-display text-2xl font-bold tracking-tight text-platinum">
              {item.itemName}
            </h1>
            {!item.exists ? (
              <p className="text-xs uppercase tracking-wide text-amber">Not yet in the catalog</p>
            ) : (
              <a
                href={wfmItemUrl(item.urlName)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-platinum-faint hover:text-teal"
              >
                Open on warframe.market
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        {user ? (
          <WatchlistToggleButton urlName={item.urlName} isWatchlisted={item.isWatchlisted} />
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(`/items/${item.urlName}`)}`}
            className="rounded-sm border border-line px-3 py-1.5 text-sm text-platinum-dim hover:border-line-strong hover:text-platinum"
          >
            Sign in to pin
          </Link>
        )}
      </div>

      {item.scannedAt === null ? (
        <EmptyState>Not scanned yet. It will show up after the next scan cycle.</EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-sm border px-3 py-3 ${
                    stat.tone === "teal"
                      ? "lane-teal border-line"
                      : stat.tone === "amber"
                        ? "lane-amber border-line"
                        : "border-line bg-void-raised"
                  }`}
                >
                  <div className="text-[11px] tracking-wider text-platinum-faint uppercase">
                    {stat.label}
                  </div>
                  <div
                    className={`font-mono-num mt-1 text-lg font-medium ${
                      stat.tone === "teal"
                        ? "text-teal"
                        : stat.tone === "amber"
                          ? "text-amber"
                          : "text-platinum"
                    }`}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="lane-teal flex flex-col items-end gap-1 rounded-sm border border-line px-3 py-2">
              <span className="text-[11px] tracking-wider text-platinum-faint uppercase">
                Sell, recent scans
              </span>
              <Sparkline values={sparkValues} className="h-10 w-36 text-teal" />
            </div>
          </div>
          <p className="text-xs text-platinum-faint">Last scanned {formatDateTime(item.scannedAt)}</p>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold text-platinum">History</h2>
        {item.history.length === 0 ? (
          <EmptyState>No history recorded yet.</EmptyState>
        ) : (
          <TableShell minWidth="600px">
            <thead>
              <tr>
                <Th>Scanned</Th>
                <Th>Sell</Th>
                <Th>Buy</Th>
                <Th>Spread</Th>
                <Th>ROI</Th>
                <Th>Median 48h</Th>
                <Th>Vol 48h</Th>
              </tr>
            </thead>
            <tbody>
              {item.history.map((point) => (
                <Tr key={point.scannedAt}>
                  <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                    {formatDateTime(point.scannedAt)}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-platinum-dim">
                    {formatPlatinum(point.lowestSell)}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-platinum-dim">
                    {formatPlatinum(point.highestBuy)}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-platinum">
                    {formatPlatinum(point.spread)}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-teal">
                    {formatPercent(point.roiPct)}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-platinum-dim">
                    {formatPlatinum(point.median48h)}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-platinum-dim">
                    {formatVolume(point.volume48h)}
                  </td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold text-platinum">Alerts</h2>
        <AlertsTable rows={item.alerts} />
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: ItemPageProps) {
  const { urlName } = await params;
  return { title: `${formatItemName(urlName)} — WF Stocks` };
}

import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

import { AlertsTable } from "@/components/AlertsList";
import { WatchlistToggleButton } from "@/components/WatchlistForms";
import { getItemDetail } from "@/lib/dashboard";
import {
  formatDateTime,
  formatItemName,
  formatPercent,
  formatPlatinum,
  formatVolume,
  wfmItemUrl,
  wfmThumbUrl,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface ItemPageProps {
  params: Promise<{ urlName: string }>;
}

export default async function ItemDetailPage({ params }: ItemPageProps) {
  const { urlName } = await params;
  const item = await getItemDetail(urlName);

  if (!item) {
    notFound();
  }

  const thumbUrl = wfmThumbUrl(item.thumb);

  const stats: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: "Lowest sell", value: formatPlatinum(item.lowestSell) },
    { label: "Highest buy", value: formatPlatinum(item.highestBuy) },
    { label: "Spread", value: formatPlatinum(item.spread) },
    { label: "ROI", value: formatPercent(item.roiPct), accent: true },
    { label: "Median 48h", value: formatPlatinum(item.median48h) },
    { label: "Volume 48h", value: formatVolume(item.volume48h) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt=""
              width={48}
              height={48}
              className="rounded border border-line bg-void-raised object-contain p-1"
            />
          ) : null}
          <div>
            <h1 className="font-display text-xl font-semibold text-platinum">{item.itemName}</h1>
            {!item.exists ? (
              <p className="text-xs uppercase tracking-wide text-amber">
                Not yet synced from the item manifest
              </p>
            ) : (
              <a
                href={wfmItemUrl(item.urlName)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-platinum-faint hover:text-teal"
              >
                warframe.market/items/{item.urlName}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        <WatchlistToggleButton urlName={item.urlName} isWatchlisted={item.isWatchlisted} />
      </div>

      {item.scannedAt === null ? (
        <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
          Not scanned yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded border border-line bg-void-raised px-3 py-3"
              >
                <div className="text-xs uppercase tracking-wide text-platinum-faint">
                  {stat.label}
                </div>
                <div
                  className={`font-mono-num mt-1 text-lg font-medium ${
                    stat.accent ? "text-teal" : "text-platinum"
                  }`}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-platinum-faint">
            Last scanned {formatDateTime(item.scannedAt)}
          </p>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold text-platinum">History</h2>
        {item.history.length === 0 ? (
          <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
            No history recorded yet.
          </p>
        ) : (
          <div className="scroll-thin overflow-x-auto rounded border border-line">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-platinum-faint">
                  <th className="px-3 py-2 font-medium">Scanned</th>
                  <th className="px-3 py-2 font-medium">Sell</th>
                  <th className="px-3 py-2 font-medium">Buy</th>
                  <th className="px-3 py-2 font-medium">Spread</th>
                  <th className="px-3 py-2 font-medium">ROI</th>
                  <th className="px-3 py-2 font-medium">Median 48h</th>
                  <th className="px-3 py-2 font-medium">Vol 48h</th>
                </tr>
              </thead>
              <tbody>
                {item.history.map((point) => (
                  <tr key={point.scannedAt} className="border-b border-line last:border-b-0">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

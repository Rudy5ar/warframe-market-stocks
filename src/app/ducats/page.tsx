import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { CatalogSyncButton } from "@/components/CatalogSyncButton";
import { getAllDucatUrlNames, getDucatBoard } from "@/lib/dashboard/ducatBoard";
import type { DucatBoardRow, DucatSort } from "@/lib/dashboard/ducatBoard";
import { formatDateTime, formatPlatinum, formatVolume, wfmItemUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ducats — WF Stocks",
};

function RecBadge({ recommendation }: { recommendation: DucatBoardRow["recommendation"] }) {
  if (recommendation === "sell") {
    return (
      <span className="rounded border border-teal-dim bg-teal-dim/10 px-2 py-0.5 text-xs font-medium text-teal">
        Sell
      </span>
    );
  }
  if (recommendation === "junk") {
    return (
      <span className="rounded border border-line px-2 py-0.5 text-xs text-platinum-faint">
        Junk
      </span>
    );
  }
  return (
    <span className="rounded border border-line px-2 py-0.5 text-xs text-platinum-faint">—</span>
  );
}

function DucatTable({ rows }: { rows: DucatBoardRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
        No ducat catalog entries. Regenerate with{" "}
        <code className="font-mono-num">node scripts/generate-catalogs.mjs</code>.
      </p>
    );
  }

  return (
    <div className="scroll-thin overflow-x-auto rounded border border-line">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-platinum-faint">
            <th className="px-3 py-2 font-medium">Part</th>
            <th className="px-3 py-2 font-medium">Sell</th>
            <th className="px-3 py-2 font-medium">Ducats</th>
            <th className="px-3 py-2 font-medium">Plat/ducat</th>
            <th className="px-3 py-2 font-medium">Do</th>
            <th className="px-3 py-2 font-medium">Vol 48h</th>
            <th className="px-3 py-2 font-medium">Scanned</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.urlName}
              className="border-b border-line last:border-b-0 transition-colors hover:bg-void-raised"
            >
              <td className="px-3 py-2">
                <Link href={`/items/${row.urlName}`} className="text-platinum hover:text-teal">
                  {row.itemName}
                </Link>
              </td>
              <td className="font-mono-num px-3 py-2 font-medium text-platinum">
                {formatPlatinum(row.lowestSell)}
              </td>
              <td className="font-mono-num px-3 py-2 text-platinum-dim">{row.ducats}</td>
              <td className="font-mono-num px-3 py-2 text-teal">
                {row.platPerDucat !== null ? row.platPerDucat.toFixed(2) : "—"}
              </td>
              <td className="px-3 py-2">
                <RecBadge recommendation={row.recommendation} />
              </td>
              <td className="font-mono-num px-3 py-2 text-platinum-dim">
                {formatVolume(row.volume48h)}
              </td>
              <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                {formatDateTime(row.scannedAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <a
                  href={wfmItemUrl(row.urlName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-platinum-faint transition-colors hover:text-teal"
                >
                  <ExternalLink size={14} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DucatsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: sortRaw } = await searchParams;
  const sort: DucatSort = sortRaw === "sell" ? "sell" : "plat_per_ducat";
  const rows = await getDucatBoard(sort, 100);
  // Sync a manageable subset: first 80 catalog urls (full catalog is ~570)
  const syncUrls = getAllDucatUrlNames().slice(0, 80);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-platinum">Ducat efficiency</h1>
          <p className="text-sm text-platinum-faint">
            Compare market sell price to fixed ducat value. Low plat/ducat → junk at Baro; high
            → sell on warframe.market. Live Baro shop is not tracked — check him when he&apos;s
            up.
          </p>
        </div>
        <CatalogSyncButton label="prices" urlNames={syncUrls} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/ducats?sort=plat_per_ducat"
          className={`rounded border px-2.5 py-1 ${
            sort === "plat_per_ducat"
              ? "border-teal-dim text-teal"
              : "border-line text-platinum-faint hover:text-platinum-dim"
          }`}
        >
          Junk candidates
        </Link>
        <Link
          href="/ducats?sort=sell"
          className={`rounded border px-2.5 py-1 ${
            sort === "sell"
              ? "border-teal-dim text-teal"
              : "border-line text-platinum-faint hover:text-platinum-dim"
          }`}
        >
          Highest sell
        </Link>
      </div>

      <DucatTable rows={rows} />
    </div>
  );
}

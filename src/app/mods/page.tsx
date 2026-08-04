import Link from "next/link";
import { ExternalLink } from "lucide-react";

import {
  AddModStashForm,
  BulkAddModStashForm,
  RemoveModStashButton,
} from "@/components/ModStashForms";
import { getMarketableMods, getModStash } from "@/lib/dashboard";
import type { MarketableModRow, ModStashRow } from "@/lib/dashboard";
import {
  formatDateTime,
  formatPlatinum,
  formatVolume,
  wfmItemUrl,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Don't dissolve — WF Stocks",
};

function RecBadge({ recommendation }: { recommendation: ModStashRow["recommendation"] }) {
  if (recommendation === "list") {
    return (
      <span className="rounded border border-teal-dim bg-teal-dim/10 px-2 py-0.5 text-xs font-medium text-teal">
        List
      </span>
    );
  }
  if (recommendation === "dissolve") {
    return (
      <span className="rounded border border-line px-2 py-0.5 text-xs text-platinum-faint">
        Dissolve
      </span>
    );
  }
  return (
    <span className="rounded border border-line px-2 py-0.5 text-xs text-platinum-faint">—</span>
  );
}

function StashTable({ rows }: { rows: ModStashRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
        Stash is empty. Add excess rare mods you&apos;re tempted to dissolve.
      </p>
    );
  }

  return (
    <div className="scroll-thin overflow-x-auto rounded border border-line">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-platinum-faint">
            <th className="px-3 py-2 font-medium">Mod</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Sell</th>
            <th className="px-3 py-2 font-medium">Endo</th>
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
                  {row.itemName ?? row.urlName}
                </Link>
                {row.isOrphan ? (
                  <span className="ml-2 text-xs text-amber">orphan</span>
                ) : null}
              </td>
              <td className="font-mono-num px-3 py-2 text-platinum-dim">{row.quantity}</td>
              <td className="font-mono-num px-3 py-2 font-medium text-platinum">
                {formatPlatinum(row.lowestSell)}
              </td>
              <td className="font-mono-num px-3 py-2 text-platinum-dim">
                {row.endo !== null ? row.endo : "—"}
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
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-2">
                  <a
                    href={wfmItemUrl(row.urlName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${row.itemName ?? row.urlName} on warframe.market`}
                    className="text-platinum-faint transition-colors hover:text-teal"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <RemoveModStashButton urlName={row.urlName} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiscoveryTable({ rows }: { rows: MarketableModRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded border border-line bg-void-raised px-4 py-6 text-sm text-platinum-dim">
        No fodder mods matched the catalog yet. Run{" "}
        <code className="font-mono-num">sync-items</code> and wait for scans (or add known
        url_names to your stash).
      </p>
    );
  }

  return (
    <div className="scroll-thin overflow-x-auto rounded border border-line">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-platinum-faint">
            <th className="px-3 py-2 font-medium">Mod</th>
            <th className="px-3 py-2 font-medium">Rarity</th>
            <th className="px-3 py-2 font-medium">Sell</th>
            <th className="px-3 py-2 font-medium">Endo</th>
            <th className="px-3 py-2 font-medium">Do</th>
            <th className="px-3 py-2 font-medium">Vol 48h</th>
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
              <td className="px-3 py-2 text-xs capitalize text-platinum-faint">
                {row.rarity ?? "—"}
              </td>
              <td className="font-mono-num px-3 py-2 font-medium text-platinum">
                {formatPlatinum(row.lowestSell)}
              </td>
              <td className="font-mono-num px-3 py-2 text-platinum-dim">
                {row.endo !== null ? row.endo : "—"}
              </td>
              <td className="px-3 py-2">
                <RecBadge recommendation={row.recommendation} />
              </td>
              <td className="font-mono-num px-3 py-2 text-platinum-dim">
                {formatVolume(row.volume48h)}
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

export default async function ModsPage() {
  const [stash, marketable] = await Promise.all([getModStash(), getMarketableMods(50)]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-xl font-semibold text-platinum">Don&apos;t dissolve</h1>
        <p className="text-sm text-platinum-faint">
          Track excess mods and see which are worth listing instead of dissolving for endo.
          Default keep threshold: sell ≥{" "}
          <code className="font-mono-num">MIN_MOD_SELL_PLAT</code> (5p).
        </p>
      </div>

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
            sell price so the ones worth listing float up. Augments stay on Syndicates.
          </p>
        </div>
        <DiscoveryTable rows={marketable} />
      </section>
    </div>
  );
}

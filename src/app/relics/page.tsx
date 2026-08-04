import Link from "next/link";

import { CatalogSyncButton } from "@/components/CatalogSyncButton";
import { getAllRelicPartUrlNames, getRelicBoard } from "@/lib/dashboard/relicBoard";
import { RELIC_ERAS } from "@/lib/dashboard/relics";
import { formatPlatinum } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Relics — WF Stocks",
};

function filterHref(params: {
  era?: string;
  vaulted?: string;
  sort?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.era && params.era !== "all") sp.set("era", params.era);
  if (params.vaulted && params.vaulted !== "all") sp.set("vaulted", params.vaulted);
  if (params.sort && params.sort !== "radiant") sp.set("sort", params.sort);
  const q = sp.toString();
  return q ? `/relics?${q}` : "/relics";
}

export default async function RelicsPage({
  searchParams,
}: {
  searchParams: Promise<{ era?: string; vaulted?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const era = params.era ?? "all";
  const vaulted =
    params.vaulted === "vaulted" || params.vaulted === "unvaulted" ? params.vaulted : "all";
  const sort = params.sort === "intact" ? "intact" : "radiant";

  const rows = await getRelicBoard({
    era: era === "all" ? null : era,
    vaulted,
    sort,
    limit: 80,
  });

  // Sync unvaulted part prices preferentially (smaller set); fall back to first 120 parts
  const allParts = getAllRelicPartUrlNames();
  const syncUrls = allParts.slice(0, 120);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-platinum">Relic value</h1>
          <p className="text-sm text-platinum-faint">
            Expected platinum from Intact / Radiant openings using current lowest sells. Run the
            high-EV relics; sync part prices if many rows show dashes.
          </p>
        </div>
        <CatalogSyncButton label="parts" urlNames={syncUrls} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center text-xs uppercase tracking-wide text-platinum-faint">
            Era
          </span>
          <Link
            href={filterHref({ era: "all", vaulted, sort })}
            className={`rounded border px-2.5 py-1 ${
              era === "all"
                ? "border-teal-dim text-teal"
                : "border-line text-platinum-faint hover:text-platinum-dim"
            }`}
          >
            All
          </Link>
          {RELIC_ERAS.map((e) => (
            <Link
              key={e}
              href={filterHref({ era: e, vaulted, sort })}
              className={`rounded border px-2.5 py-1 ${
                era === e
                  ? "border-teal-dim text-teal"
                  : "border-line text-platinum-faint hover:text-platinum-dim"
              }`}
            >
              {e}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center text-xs uppercase tracking-wide text-platinum-faint">
            Vault
          </span>
          {(
            [
              ["all", "All"],
              ["unvaulted", "Available"],
              ["vaulted", "Vaulted"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={filterHref({ era, vaulted: value, sort })}
              className={`rounded border px-2.5 py-1 ${
                vaulted === value
                  ? "border-teal-dim text-teal"
                  : "border-line text-platinum-faint hover:text-platinum-dim"
              }`}
            >
              {label}
            </Link>
          ))}
          <span className="self-center text-xs uppercase tracking-wide text-platinum-faint">
            Sort
          </span>
          <Link
            href={filterHref({ era, vaulted, sort: "radiant" })}
            className={`rounded border px-2.5 py-1 ${
              sort === "radiant"
                ? "border-teal-dim text-teal"
                : "border-line text-platinum-faint hover:text-platinum-dim"
            }`}
          >
            Radiant EV
          </Link>
          <Link
            href={filterHref({ era, vaulted, sort: "intact" })}
            className={`rounded border px-2.5 py-1 ${
              sort === "intact"
                ? "border-teal-dim text-teal"
                : "border-line text-platinum-faint hover:text-platinum-dim"
            }`}
          >
            Intact EV
          </Link>
        </div>
      </div>

      <div className="scroll-thin overflow-x-auto rounded border border-line">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-platinum-faint">
              <th className="px-3 py-2 font-medium">Relic</th>
              <th className="px-3 py-2 font-medium">Era</th>
              <th className="px-3 py-2 font-medium">Intact EV</th>
              <th className="px-3 py-2 font-medium">Radiant EV</th>
              <th className="px-3 py-2 font-medium">Priced</th>
              <th className="px-3 py-2 font-medium">Vault</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-sm text-platinum-dim">
                  No relics match these filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-line last:border-b-0 transition-colors hover:bg-void-raised"
                >
                  <td className="px-3 py-2 font-medium text-platinum">{row.name}</td>
                  <td className="px-3 py-2 text-platinum-dim">{row.era}</td>
                  <td className="font-mono-num px-3 py-2 text-platinum-dim">
                    {row.intactEv !== null ? formatPlatinum(Math.round(row.intactEv)) : "—"}
                  </td>
                  <td className="font-mono-num px-3 py-2 font-medium text-teal">
                    {row.radiantEv !== null ? formatPlatinum(Math.round(row.radiantEv)) : "—"}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-xs text-platinum-faint">
                    {row.pricedDrops}/{row.totalDrops}
                  </td>
                  <td className="px-3 py-2 text-xs text-platinum-faint">
                    {row.vaulted ? "Vaulted" : "Available"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

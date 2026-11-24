import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HomeWorkbench } from "@/components/HomeWorkbench";
import { CopyWhisperButton } from "@/components/ui/CopyWhisperButton";
import { ItemPreviewThumb } from "@/components/ui/ItemPreviewThumb";
import { Sparkline } from "@/components/ui/Sparkline";
import { WfmLink } from "@/components/ui/WfmLink";
import { getHomeBriefing } from "@/lib/dashboard";
import { formatPlatinum, formatRelativeTime } from "@/lib/format";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [briefing, user] = await Promise.all([getHomeBriefing(), getAuthUser()]);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-platinum sm:text-[28px]">
            Worth acting on right now
          </h1>
          <p className="text-sm text-platinum-dim">
            Live just-posted in-game listings matched against 48h market averages, plus live hourly
            Baro Ducats and Relics. Click any picture to read the mod card.
          </p>
        </div>

        <Link
          href="/flips"
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-void-raised px-3.5 py-2 text-xs font-semibold text-platinum transition-colors hover:border-gold/50 hover:text-gold"
        >
          {briefing.liveCount > 0 ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-teal" aria-hidden />
              <span className="font-mono-num text-teal">{briefing.liveCount} live</span>
              <span className="text-platinum-faint">·</span>
            </>
          ) : null}
          <span className="font-mono-num text-gold">{briefing.cheapCount} cheap</span>
          <span className="text-platinum-faint">·</span>
          <span className="font-mono-num text-red">{briefing.spikeCount} spiking</span>
          <ArrowRight size={13} />
        </Link>
      </header>

      {/* 3-Card Deal Spotlight Shelf */}
      {briefing.spotlightDeals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-void-raised/60 px-5 py-7 text-sm text-platinum-dim">
          No liquid deals detected right this moment. Open{" "}
          <Link href="/flips" className="text-gold hover:underline">
            Deals
          </Link>{" "}
          to view all cached bargains.
        </div>
      ) : (
        <section aria-label="Spotlight deals" className="grid gap-4 md:grid-cols-3">
          {briefing.spotlightDeals.map((deal) => {
            const isSpike = deal.call === "spike";
            const badgeText =
              deal.diffPct !== null
                ? isSpike
                  ? `Sell +${deal.diffPct}%`
                  : `Cheap ${deal.diffPct}%`
                : isSpike
                  ? "Sell high"
                  : "Grab cheap";
            const badgeTone = isSpike
              ? "border-red/35 bg-red/15 text-red"
              : "border-teal/35 bg-teal/15 text-teal";
            const sparkTone = isSpike ? "text-red" : "text-teal";
            const priceTone = isSpike ? "text-gold" : "text-teal";

            return (
              <article
                key={deal.urlName}
                className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-void-raised p-5 transition-colors hover:border-line-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <ItemPreviewThumb
                      urlName={deal.urlName}
                      itemName={deal.itemName}
                      thumb={deal.thumb}
                      size={40}
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/items/${deal.urlName}`}
                        className="block truncate text-sm font-semibold text-platinum transition-colors hover:text-gold"
                      >
                        {deal.itemName}
                      </Link>
                      <p className="font-mono-num mt-0.5 text-xs text-platinum-faint">
                        {deal.median48h !== null
                          ? `avg ${formatPlatinum(Math.round(deal.median48h))} · `
                          : ""}
                        {deal.volume48h} vol
                        {deal.isLive ? ` · ${formatRelativeTime(deal.scannedAt)}` : ""}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`font-mono-num shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeTone}`}
                  >
                    {badgeText}
                  </span>
                </div>

                {deal.sparkline && deal.sparkline.length >= 2 ? (
                  <Sparkline values={deal.sparkline} className={`h-10 w-full ${sparkTone}`} />
                ) : (
                  <div className="flex items-center justify-between rounded-lg bg-void/60 px-3 py-2 text-xs text-platinum-dim">
                    <span className="truncate">
                      {deal.isLive && deal.sellerName
                        ? `Live · ${deal.sellerName}`
                        : isSpike
                          ? "Above 48h avg"
                          : "Below 48h avg"}
                    </span>
                    <span className={`font-mono-num shrink-0 font-semibold ${sparkTone}`}>
                      {deal.diffPlat !== null
                        ? `${deal.diffPlat > 0 ? "+" : ""}${deal.diffPlat}p`
                        : "—"}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 border-t border-line/70 pt-3">
                  <span className={`font-mono-num text-2xl font-bold ${priceTone}`}>
                    {formatPlatinum(deal.lowestSell)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {deal.whisper ? <CopyWhisperButton whisper={deal.whisper} compact /> : null}
                    <WfmLink urlName={deal.urlName} itemName={deal.itemName} label="WFM" />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Full-Width Tabbed Farming Workbench */}
      <HomeWorkbench
        syndicates={briefing.syndicates}
        ducatJunk={briefing.ducatJunk}
        ducatSell={briefing.ducatSell}
        relics={briefing.relics}
        stashListMods={briefing.stashListMods}
        fodderMods={briefing.fodderMods}
        signedIn={Boolean(user)}
      />
    </div>
  );
}

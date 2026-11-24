"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Maximize2, X } from "lucide-react";

import { wfmItemUrl, wfmThumbUrl } from "@/lib/format";

interface ItemPreviewData {
  name: string;
  description: string | null;
  wikiLink: string | null;
  ducats: number | null;
  maxRank: number | null;
  tags: string[];
  imageUrl: string | null;
}

const previewCache = new Map<string, ItemPreviewData>();

export function ItemPreviewThumb({
  urlName,
  itemName,
  thumb,
  size = 32,
}: {
  urlName: string;
  itemName: string;
  thumb: string | null | undefined;
  size?: number;
}) {
  const thumbSrc = wfmThumbUrl(thumb ?? null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ItemPreviewData | null>(() => previewCache.get(urlName) ?? null);
  const [loading, setLoading] = useState(false);
  const [imgFallback, setImgFallback] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open || previewCache.has(urlName)) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/item-preview/${encodeURIComponent(urlName)}`)
      .then((res) => (res.ok ? (res.json() as Promise<ItemPreviewData>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        previewCache.set(urlName, data);
        setPreview(data);
        setImgFallback(false);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, urlName]);

  const dim = `${size}px`;
  const displaySrc = !imgFallback && preview?.imageUrl ? preview.imageUrl : thumbSrc;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        title={`Preview ${itemName} card`}
        aria-label={`Preview ${itemName} image and details`}
        className="group relative shrink-0 overflow-hidden rounded-md border border-line bg-void-panel transition-colors hover:border-gold focus-visible:border-gold"
        style={{ width: dim, height: dim }}
      >
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt=""
            width={size}
            height={size}
            className="h-full w-full object-contain p-0.5 transition-transform duration-150 group-hover:scale-110"
          />
        ) : (
          <span className="block h-full w-full bg-void-panel" aria-hidden />
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-void/65 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          <Maximize2 size={11} className="text-gold" />
        </span>
      </button>

      {open ? (
        <dialog
          ref={dialogRef}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === dialogRef.current) setOpen(false);
          }}
          className="m-auto w-[min(92vw,420px)] rounded-xl border border-line-strong bg-void-raised p-0 text-platinum shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="font-display truncate text-base font-semibold text-platinum">
                {preview?.name ?? itemName}
              </h2>
              {preview?.tags && preview.tags.length > 0 ? (
                <p className="mt-1 truncate text-xs text-platinum-faint">
                  {preview.tags
                    .slice(0, 4)
                    .map((t) => t.replace(/_/g, " "))
                    .join(" · ")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close preview"
              className="rounded-md border border-line p-1.5 text-platinum-dim transition-colors hover:border-line-strong hover:text-platinum"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 px-5 py-5">
            <div className="flex min-h-[220px] w-full items-center justify-center rounded-lg border border-line bg-void p-4">
              {displaySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displaySrc}
                  alt={itemName}
                  onError={() => setImgFallback(true)}
                  className="max-h-[300px] w-auto object-contain"
                />
              ) : (
                <span className="text-xs text-platinum-faint">No image available</span>
              )}
            </div>

            {loading ? (
              <div className="h-4 w-48 animate-pulse rounded bg-void-panel" />
            ) : preview?.description ? (
              <p className="w-full rounded-lg border border-line bg-void-panel/70 px-3.5 py-2.5 text-sm leading-relaxed text-platinum-dim">
                {preview.description}
              </p>
            ) : null}

            {(preview?.ducats || preview?.maxRank) ? (
              <div className="flex w-full flex-wrap gap-2 text-xs">
                {preview.ducats ? (
                  <span className="font-mono-num rounded-md border border-gold/30 bg-gold/10 px-2.5 py-1 text-gold">
                    {preview.ducats} ducats
                  </span>
                ) : null}
                {preview.maxRank ? (
                  <span className="font-mono-num rounded-md border border-line bg-void-panel px-2.5 py-1 text-platinum-dim">
                    Max rank {preview.maxRank}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-rail px-5 py-3.5 text-xs">
            <Link
              href={`/items/${urlName}`}
              onClick={() => setOpen(false)}
              className="rounded-md border border-gold/40 bg-gold/15 px-3 py-1.5 font-medium text-gold transition-colors hover:bg-gold/25"
            >
              Price history &amp; details
            </Link>
            <div className="flex items-center gap-2">
              {preview?.wikiLink ? (
                <a
                  href={preview.wikiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-platinum-dim transition-colors hover:border-line-strong hover:text-platinum"
                >
                  <BookOpen size={12} />
                  Wiki
                </a>
              ) : null}
              <a
                href={wfmItemUrl(urlName)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-platinum-dim transition-colors hover:border-gold/50 hover:text-gold"
              >
                warframe.market
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}

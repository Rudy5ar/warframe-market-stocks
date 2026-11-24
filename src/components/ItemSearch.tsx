"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { searchCatalogAction } from "@/lib/dashboard/actions";
import type { CatalogHit } from "@/lib/dashboard/types";
import { ItemThumb } from "@/components/ui/ItemThumb";

export function ItemSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CatalogHit[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchCatalogAction(query)
        .then((rows) => {
          setHits(rows);
          setOpen(true);
        })
        .catch(() => setHits([]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  function go(urlName: string) {
    setOpen(false);
    setQuery("");
    router.push(`/items/${urlName}`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const slug = query.trim().toLowerCase().replace(/\s+/g, "_");
    if (hits[0]) {
      go(hits[0].urlName);
      return;
    }
    if (slug) go(slug);
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <form onSubmit={onSubmit}>
        <label className="sr-only" htmlFor={inputId}>
          Search items
        </label>
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-platinum-faint"
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Search items, mods…"
          autoComplete="off"
          className="w-full rounded-lg border border-line bg-void py-2 pr-3 pl-8 text-sm text-platinum placeholder:text-platinum-faint transition-colors hover:border-line-strong focus:border-gold"
        />
      </form>
      {open && hits.length > 0 ? (
        <ul className="absolute z-40 mt-1.5 max-h-72 w-full min-w-[220px] overflow-auto rounded-xl border border-line-strong bg-void-raised p-1 shadow-xl">
          {hits.map((hit) => (
            <li key={hit.urlName}>
              <button
                type="button"
                onClick={() => go(hit.urlName)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-platinum transition-colors hover:bg-void-panel"
              >
                <ItemThumb thumb={hit.thumb} size={24} />
                <span className="truncate">{hit.itemName}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

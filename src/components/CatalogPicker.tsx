"use client";

import { useEffect, useId, useRef, useState } from "react";

import { searchCatalogAction } from "@/lib/dashboard/actions";
import type { CatalogHit } from "@/lib/dashboard/types";
import { ItemThumb } from "@/components/ui/ItemThumb";

function toUrlName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Combobox that fills a url_name field; paste still works. */
export function CatalogPicker({
  name = "urlName",
  placeholder,
}: {
  name?: string;
  placeholder: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState("");
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

  const value = picked || toUrlName(query);

  return (
    <div ref={rootRef} className="relative min-w-[200px] flex-1">
      <input type="hidden" name={name} value={value} />
      <input
        value={query}
        onChange={(event) => {
          setPicked("");
          setQuery(event.target.value);
        }}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        className="w-full rounded-sm border border-line bg-void-panel px-3 py-2 text-sm text-platinum placeholder:text-platinum-faint"
      />
      {open && hits.length > 0 ? (
        <ul
          id={listId}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-line bg-void-raised py-1 shadow-lg"
        >
          {hits.map((hit) => (
            <li key={hit.urlName}>
              <button
                type="button"
                onClick={() => {
                  setPicked(hit.urlName);
                  setQuery(hit.itemName);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-platinum hover:bg-void-panel"
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

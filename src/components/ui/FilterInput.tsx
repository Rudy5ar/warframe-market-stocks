"use client";

import { useState } from "react";

export function FilterInput({
  value,
  onChange,
  placeholder = "Filter…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full max-w-xs rounded-sm border border-line bg-void-panel px-3 py-1.5 text-sm text-platinum placeholder:text-platinum-faint"
    />
  );
}

export function useTextFilter<T>(rows: T[], haystack: (row: T) => string) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter((row) => haystack(row).toLowerCase().includes(q)) : rows;
  return { query, setQuery, filtered };
}

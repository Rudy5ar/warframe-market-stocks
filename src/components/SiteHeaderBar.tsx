"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { ItemSearch } from "@/components/ItemSearch";
import { ScanStatusBadge } from "@/components/ScanStatusBadge";
import type { ScanStatus } from "@/lib/supabase/database.types";

export const NAV_GROUPS = [
  {
    label: "Market",
    links: [
      { href: "/flips", label: "Flips" },
      { href: "/alerts", label: "Alerts" },
      { href: "/watchlist", label: "Watchlist" },
    ],
  },
  {
    label: "Inventory",
    links: [
      { href: "/mods", label: "Mods" },
      { href: "/syndicates", label: "Syndicates" },
      { href: "/ducats", label: "Ducats" },
      { href: "/relics", label: "Relics" },
    ],
  },
  {
    label: "Ops",
    links: [{ href: "/status", label: "Status" }],
  },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href;
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-2">
          <span className="text-[10px] font-medium tracking-[0.14em] text-platinum-faint uppercase">
            {group.label}
          </span>
          <div className="flex flex-wrap items-center gap-0.5">
            {group.links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={`rounded-sm px-2 py-1 text-sm transition-colors ${
                    active
                      ? "bg-teal-dim/25 text-teal"
                      : "text-platinum-dim hover:bg-void-panel hover:text-platinum"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export function SiteHeaderBar({
  status,
  lastRunLabel,
}: {
  status: ScanStatus;
  lastRunLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-void/80 backdrop-blur-md">
      <div className="scan-filament" data-status={status} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-3 py-2.5">
          <Link
            href="/"
            className="font-display shrink-0 text-lg font-bold tracking-[0.12em]"
          >
            <span className="text-teal">WF</span>
            <span className="text-platinum"> STOCKS</span>
          </Link>
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <ItemSearch />
          </div>
          <Link
            href="/status"
            className="flex items-center gap-2 text-xs text-platinum-faint hover:text-platinum-dim"
          >
            <ScanStatusBadge status={status} />
            <span className="hidden sm:inline">{lastRunLabel}</span>
          </Link>
          <button
            type="button"
            className="rounded-sm border border-line p-1.5 text-platinum-dim lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
        <nav className="hidden items-end gap-6 border-t border-line py-2 lg:flex">
          <NavLinks pathname={pathname} />
        </nav>
        {open ? (
          <nav className="flex flex-col gap-4 border-t border-line py-3 lg:hidden">
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          </nav>
        ) : null}
      </div>
    </header>
  );
}

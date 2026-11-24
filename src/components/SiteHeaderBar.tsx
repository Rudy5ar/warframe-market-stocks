"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Coins,
  Gem,
  Layers,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  Star,
  X,
} from "lucide-react";

import { ItemSearch } from "@/components/ItemSearch";
import { ScanStatusBadge } from "@/components/ScanStatusBadge";
import { BrandMark } from "@/components/ui/BrandMark";
import { signOut } from "@/lib/auth/actions";
import type { ScanStatus } from "@/lib/supabase/database.types";

const NAV_GROUPS = [
  {
    label: "Session",
    links: [
      { href: "/", label: "Workbench", icon: LayoutDashboard },
      { href: "/flips", label: "Deals", icon: Sparkles },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/watchlist", label: "Watchlist", icon: Star },
    ],
  },
  {
    label: "Farming",
    links: [
      { href: "/syndicates", label: "Syndicates", icon: Shield },
      { href: "/ducats", label: "Ducats", icon: Coins },
      { href: "/relics", label: "Relics", icon: Gem },
      { href: "/mods", label: "Mods", icon: Layers },
    ],
  },
  {
    label: "Ops",
    links: [{ href: "/status", label: "Status", icon: Activity }],
  },
] as const;

function NavGroups({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <span className="px-2.5 pb-1 text-[10px] font-semibold tracking-[0.14em] text-platinum-faint uppercase">
            {group.label}
          </span>
          {group.links.map((link) => {
            const Icon = link.icon;
            const active =
              link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-gold/30 bg-gold/12 text-gold"
                    : "border-transparent text-platinum-dim hover:bg-void-raised hover:text-platinum"
                }`}
              >
                <Icon size={16} className={active ? "text-gold" : "text-platinum-faint"} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function SiteHeaderBar({
  status,
  lastRunLabel,
  userEmail,
}: {
  status: ScanStatus;
  lastRunLabel: string;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  return (
    <>
      {/* Mobile / tablet compact top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-rail/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <BrandMark size={26} />
            <span className="font-display text-sm font-bold tracking-wide text-platinum">
              Tenno <span className="text-gold">Desk</span>
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <ItemSearch />
          </div>
          <button
            type="button"
            className="rounded-lg border border-line bg-void-raised p-2 text-platinum-dim transition-colors hover:border-line-strong hover:text-platinum"
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {open ? (
          <nav className="border-t border-line bg-rail px-4 py-4">
            <NavGroups pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
              <Link
                href="/status"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-xs text-platinum-faint hover:text-platinum-dim"
              >
                <ScanStatusBadge status={status} />
                <span>{lastRunLabel}</span>
              </Link>
              {userEmail ? (
                <form action={signOut}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-platinum-dim hover:text-platinum"
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href={loginHref}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/12 px-2.5 py-1 text-xs font-medium text-gold"
                >
                  <LogIn size={13} />
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        ) : null}
      </header>

      {/* Desktop persistent left sidebar */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-line lg:bg-rail">
        <div className="flex flex-col gap-4 border-b border-line px-4 py-5">
          <Link href="/" className="flex items-center gap-2.5 px-1">
            <BrandMark size={30} />
            <div className="flex flex-col">
              <span className="font-display text-[15px] font-bold tracking-tight text-platinum">
                Tenno <span className="text-gold">Desk</span>
              </span>
              <span className="text-[11px] text-platinum-faint">Warframe.market PC</span>
            </div>
          </Link>
          <ItemSearch />
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
          <NavGroups pathname={pathname} />
        </nav>

        <div className="flex flex-col gap-3 border-t border-line p-3">
          <Link
            href="/status"
            className="flex items-center justify-between gap-2 rounded-lg border border-line bg-void-raised px-3 py-2.5 text-xs transition-colors hover:border-line-strong"
          >
            <ScanStatusBadge status={status} />
            <span className="font-mono-num text-platinum-dim">{lastRunLabel}</span>
          </Link>

          {userEmail ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-line/70 bg-void/60 px-3 py-2">
              <span
                className="min-w-0 truncate text-xs text-platinum-dim"
                title={userEmail}
              >
                {userEmail}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  title="Sign out"
                  aria-label="Sign out"
                  className="rounded-md p-1 text-platinum-faint transition-colors hover:bg-void-panel hover:text-platinum"
                >
                  <LogOut size={14} />
                </button>
              </form>
            </div>
          ) : (
            <Link
              href={loginHref}
              className="flex items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/12 px-3 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              <LogIn size={14} />
              Sign in for Watchlist &amp; Stash
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

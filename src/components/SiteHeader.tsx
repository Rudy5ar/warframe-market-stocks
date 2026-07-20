import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Opportunities" },
  { href: "/alerts", label: "Alerts" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/status", label: "Status" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-void/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-display flex items-center gap-2 text-lg font-semibold tracking-wide text-platinum"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-teal" aria-hidden />
          WF STOCKS
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-1.5 text-platinum-dim transition-colors hover:bg-void-panel hover:text-platinum"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

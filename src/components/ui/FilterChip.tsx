import Link from "next/link";
import type { ReactNode } from "react";

export function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-gold/45 bg-gold/15 text-gold"
          : "border-line bg-void-raised text-platinum-dim hover:border-line-strong hover:text-platinum"
      }`}
    >
      {children}
    </Link>
  );
}

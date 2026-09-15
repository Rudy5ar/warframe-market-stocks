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
      className={`rounded-sm border px-2.5 py-1 text-sm transition-colors ${
        active
          ? "border-teal-dim bg-teal-dim/25 text-teal"
          : "border-line bg-void-raised text-platinum-faint hover:text-platinum-dim"
      }`}
    >
      {children}
    </Link>
  );
}

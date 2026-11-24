import type { ReactNode } from "react";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-void-raised/60 px-5 py-7 text-sm text-platinum-dim">
      {children}
    </p>
  );
}

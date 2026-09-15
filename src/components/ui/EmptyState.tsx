import type { ReactNode } from "react";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-sm border border-dashed border-line bg-void-raised/80 px-4 py-6 text-sm text-platinum-dim">
      {children}
    </p>
  );
}

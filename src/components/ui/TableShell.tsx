import type { ReactNode } from "react";

export function TableShell({
  children,
  minWidth = "720px",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="scroll-thin max-h-[70vh] overflow-auto rounded-sm border border-line bg-void-raised/90">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`sticky top-0 z-[1] bg-void-panel px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-platinum-faint ${className}`}
    >
      {children}
    </th>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-line last:border-b-0 transition-colors hover:bg-teal-dim/10">
      {children}
    </tr>
  );
}

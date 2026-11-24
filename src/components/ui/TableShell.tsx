import type { ReactNode } from "react";

export function TableShell({
  children,
  minWidth = "720px",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="scroll-thin max-h-[72vh] overflow-auto rounded-xl border border-line bg-void-raised shadow-sm">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`sticky top-0 z-[1] border-b border-line bg-void-panel px-3.5 py-2.5 text-left text-[11px] font-semibold tracking-wider text-platinum-faint uppercase ${className}`}
    >
      {children}
    </th>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-line/70 transition-colors last:border-b-0 hover:bg-void-panel/60">
      {children}
    </tr>
  );
}

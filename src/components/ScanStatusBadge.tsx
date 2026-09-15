import type { ScanStatus } from "@/lib/supabase/database.types";

const STATUS_STYLES: Record<ScanStatus, string> = {
  idle: "border-line-strong bg-void-panel text-platinum-dim",
  running: "border-teal-dim bg-teal-dim/20 text-teal",
  error: "border-red/50 bg-red/10 text-red",
};

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase ${STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

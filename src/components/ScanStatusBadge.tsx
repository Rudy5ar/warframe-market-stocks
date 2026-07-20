import type { ScanStatus } from "@/lib/supabase/database.types";

const STATUS_STYLES: Record<ScanStatus, string> = {
  idle: "border-line-strong text-platinum-dim",
  running: "border-teal-dim text-teal",
  error: "border-red/50 text-red",
};

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

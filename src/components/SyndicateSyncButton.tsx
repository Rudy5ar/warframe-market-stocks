"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { scanSyndicateMods } from "@/lib/dashboard/actions";

const CHUNK_SIZE = 20;

export function SyndicateSyncButton({
  syndicate,
  urlNames,
}: {
  syndicate: string;
  urlNames: string[];
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  const syncing = progress !== null;
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  async function handleSync() {
    setFailedCount(0);
    setProgress({ done: 0, total: urlNames.length });

    let failures = 0;
    for (let i = 0; i < urlNames.length; i += CHUNK_SIZE) {
      const chunk = urlNames.slice(i, i + CHUNK_SIZE);
      try {
        const result = await scanSyndicateMods(chunk);
        failures += result.failed.length;
      } catch {
        failures += chunk.length;
      }
      setFailedCount(failures);
      setProgress({ done: Math.min(i + chunk.length, urlNames.length), total: urlNames.length });
    }

    setProgress(null);
    router.refresh();
  }

  if (syncing) {
    return (
      <div
        className="flex items-center gap-2"
        role="status"
        aria-label={`Syncing ${syndicate}: ${pct}%`}
      >
        <RefreshCw size={12} className="animate-spin text-teal" />
        <div className="h-1.5 w-24 overflow-hidden rounded border border-line bg-void-raised">
          <div className="h-full bg-teal transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono-num text-xs font-medium text-teal">{pct}%</span>
        <span className="font-mono-num text-xs text-platinum-faint">
          {progress.done}/{progress.total}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {failedCount > 0 ? (
        <span className="text-xs text-amber">{failedCount} failed</span>
      ) : null}
      <button
        type="button"
        onClick={handleSync}
        disabled={urlNames.length === 0}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-void-raised px-3 py-1.5 text-xs font-medium text-platinum-dim transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
      >
        <RefreshCw size={12} />
        Sync all ({urlNames.length})
      </button>
    </div>
  );
}

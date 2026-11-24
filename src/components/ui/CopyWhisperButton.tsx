"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyWhisperButton({
  whisper,
  compact = false,
}: {
  whisper: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(whisper);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked in insecure context.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={whisper}
      className={`inline-flex items-center gap-1.5 rounded-md border text-xs font-semibold transition-colors ${
        compact ? "px-2 py-1" : "px-2.5 py-1.5"
      } ${
        copied
          ? "border-teal/45 bg-teal/18 text-teal"
          : "border-line bg-void-panel text-platinum-dim hover:border-gold/50 hover:text-gold"
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      <span>{copied ? "Copied /w" : "Copy /w"}</span>
    </button>
  );
}

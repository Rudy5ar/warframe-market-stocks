import { ExternalLink } from "lucide-react";

import { wfmItemUrl } from "@/lib/format";

export function WfmLink({
  urlName,
  itemName,
  label,
}: {
  urlName: string;
  itemName: string;
  label?: string;
}) {
  return (
    <a
      href={wfmItemUrl(urlName)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${itemName} on warframe.market`}
      title="Open on warframe.market"
      className="inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-1 text-xs font-medium text-platinum-faint transition-colors hover:border-line hover:bg-void-panel hover:text-gold"
    >
      {label ? <span>{label}</span> : null}
      <ExternalLink size={13} />
    </a>
  );
}

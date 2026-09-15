import { ExternalLink } from "lucide-react";

import { wfmItemUrl } from "@/lib/format";

export function WfmLink({ urlName, itemName }: { urlName: string; itemName: string }) {
  return (
    <a
      href={wfmItemUrl(urlName)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${itemName} on warframe.market`}
      className="text-platinum-faint transition-colors hover:text-teal"
    >
      <ExternalLink size={14} />
    </a>
  );
}

import Link from "next/link";

import { ItemPreviewThumb } from "@/components/ui/ItemPreviewThumb";

export function ItemNameLink({
  urlName,
  name,
  thumb,
  orphan,
}: {
  urlName: string;
  name: string;
  thumb?: string | null;
  orphan?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <ItemPreviewThumb urlName={urlName} itemName={name} thumb={thumb} size={32} />
      <Link
        href={`/items/${urlName}`}
        className="flex min-w-0 flex-col text-platinum transition-colors hover:text-gold"
      >
        <span className="truncate font-medium">{name}</span>
        {orphan ? (
          <span className="text-[10px] tracking-wide text-amber uppercase">pending sync</span>
        ) : null}
      </Link>
    </div>
  );
}

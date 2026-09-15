import Link from "next/link";

import { ItemThumb } from "@/components/ui/ItemThumb";

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
    <Link
      href={`/items/${urlName}`}
      className="flex items-center gap-2.5 text-platinum hover:text-teal"
    >
      <ItemThumb thumb={thumb} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{name}</span>
        {orphan ? (
          <span className="text-[10px] uppercase tracking-wide text-amber">pending sync</span>
        ) : null}
      </span>
    </Link>
  );
}

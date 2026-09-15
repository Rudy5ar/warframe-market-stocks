import { wfmThumbUrl } from "@/lib/format";

export function ItemThumb({
  thumb,
  size = 28,
}: {
  thumb: string | null | undefined;
  size?: number;
}) {
  const src = wfmThumbUrl(thumb ?? null);
  const dim = `${size}px`;

  if (!src) {
    return (
      <span
        className="shrink-0 rounded-sm border border-line bg-void-panel"
        style={{ width: dim, height: dim }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-sm border border-line bg-void-panel object-contain p-0.5"
      style={{ width: dim, height: dim }}
    />
  );
}

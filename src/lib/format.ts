/** Shared display formatting for numbers/timestamps across dashboard pages. */

export function formatPlatinum(value: number | null): string {
  if (value === null) return "—";
  return `${value.toLocaleString("en-US")}p`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatVolume(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US");
}

export function formatItemName(urlName: string): string {
  return urlName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";

  const diffMs = Date.now() - then;
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 48) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  return `${diffDay}d ago`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function wfmItemUrl(urlName: string): string {
  return `https://warframe.market/items/${urlName}`;
}

export function wfmThumbUrl(thumb: string | null): string | null {
  return thumb ? `https://warframe.market/static/assets/${thumb}` : null;
}

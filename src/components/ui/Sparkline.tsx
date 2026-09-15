/** Inline 7-day (or shorter) sell series. Pass values oldest → newest. */
export function Sparkline({
  values,
  className = "h-8 w-28 text-teal",
}: {
  values: Array<number | null>;
  className?: string;
}) {
  const nums = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (nums.length < 2) return null;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const width = 112;
  const height = 32;
  const pad = 1.5;

  const d = nums
    .map((value, index) => {
      const x = pad + (index / (nums.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (value - min) / span) * (height - pad * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      fill="none"
    >
      <path d={d} stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

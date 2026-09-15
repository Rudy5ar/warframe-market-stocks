const POSITIVE = new Set(["list", "sell"]);
const NEGATIVE = new Set(["dissolve", "junk"]);

export function RecBadge({ recommendation }: { recommendation: string | null | undefined }) {
  if (!recommendation || recommendation === "unknown") {
    return (
      <span className="rounded-sm border border-line px-2 py-0.5 text-xs text-platinum-faint">—</span>
    );
  }

  const label = recommendation.charAt(0).toUpperCase() + recommendation.slice(1);
  const tone = POSITIVE.has(recommendation)
    ? "border-teal-dim bg-teal-dim/20 text-teal"
    : NEGATIVE.has(recommendation)
      ? "border-red/40 bg-red/10 text-red"
      : "border-line text-platinum-faint";

  return (
    <span className={`rounded-sm border px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
  );
}

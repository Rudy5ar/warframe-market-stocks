const GOOD_BUY = new Set(["grab", "cheap", "junk"]);
const GOOD_SELL = new Set(["sell", "list", "spike"]);
const WARN = new Set(["borderline", "dissolve"]);

const LABELS: Record<string, string> = {
  grab: "Grab cheap",
  cheap: "Cheap",
  sell: "Sell plat",
  spike: "Sell high",
  list: "List",
  dissolve: "Dissolve",
  junk: "Baro junk",
  borderline: "Your call",
};

export function RecBadge({ recommendation }: { recommendation: string | null | undefined }) {
  if (!recommendation || recommendation === "unknown") {
    return (
      <span className="inline-block rounded-md border border-line px-2 py-0.5 text-xs text-platinum-faint">
        —
      </span>
    );
  }

  const key = recommendation.toLowerCase();
  const label = LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
  const tone = GOOD_BUY.has(key)
    ? "border-teal/35 bg-teal/15 text-teal"
    : GOOD_SELL.has(key)
      ? "border-gold/40 bg-gold/15 text-gold"
      : WARN.has(key)
        ? "border-red/35 bg-red/12 text-red"
        : "border-line bg-void-panel text-platinum-dim";

  return (
    <span className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect width="64" height="64" rx="15" fill="#1A1E27" />
      <rect x="2" y="2" width="60" height="60" rx="13" stroke="#31394A" stroke-width="2.5" />
      <path
        d="M32 10L51 32L32 54L13 32L32 10Z"
        fill="#14171D"
        stroke="#DDB764"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M32 20L42 32L32 44L22 32L32 20Z"
        fill="#DDB764"
        fillOpacity="0.22"
        stroke="#F4DF9F"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="4.2" fill="#DDB764" />
    </svg>
  );
}

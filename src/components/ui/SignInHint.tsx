import Link from "next/link";

export function SignInHint({ next, children }: { next: string; children: string }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-void-raised/60 px-5 py-6 text-sm text-platinum-dim">
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="font-semibold text-gold hover:underline"
      >
        Sign in
      </Link>{" "}
      {children}
    </p>
  );
}

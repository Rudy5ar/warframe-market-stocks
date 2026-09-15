import Link from "next/link";

export function SignInHint({ next, children }: { next: string; children: string }) {
  return (
    <p className="rounded-sm border border-dashed border-line bg-void-raised/80 px-4 py-6 text-sm text-platinum-dim">
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="text-teal hover:underline"
      >
        Sign in
      </Link>{" "}
      {children}
    </p>
  );
}

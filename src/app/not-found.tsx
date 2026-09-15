import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-3 py-12">
      <p className="text-[11px] font-medium tracking-[0.2em] text-teal uppercase">Missing</p>
      <h1 className="font-display text-2xl font-bold text-platinum">Item not found</h1>
      <p className="max-w-md text-sm text-platinum-faint">
        Nothing in the catalog or watchlist matches that name. Search from the header or go back
        home.
      </p>
      <Link href="/" className="w-fit text-sm text-teal hover:underline">
        Back to today
      </Link>
    </div>
  );
}

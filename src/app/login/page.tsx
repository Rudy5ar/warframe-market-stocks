import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { safeNextPath } from "@/lib/auth/paths";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — WF Stocks",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  if (await getAuthUser()) {
    redirect(next);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <PageHeader
        title="Sign in"
        description="Your watchlist and mod stash stay on this account. Market boards are shared."
      />
      <AuthForm mode="login" next={next} />
      <p className="text-xs text-platinum-faint">
        Just browsing flips?{" "}
        <Link href="/" className="text-teal hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

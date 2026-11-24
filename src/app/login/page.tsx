import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { safeNextPath } from "@/lib/auth/paths";
import { isPublicSignupEnabled } from "@/lib/auth/policy";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getAuthUser()) {
    redirect(next);
  }

  const signupsOpen = isPublicSignupEnabled();
  const callbackError =
    params.error === "callback"
      ? "Confirmation link expired or invalid. Please sign in or request a new link."
      : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <PageHeader
        title="Sign in"
        description="Your watchlist and mod stash stay on this account. Market boards are shared."
      />
      {callbackError ? <p className="text-sm text-red">{callbackError}</p> : null}
      <AuthForm mode="login" next={next} showSignupLink={signupsOpen} />
      <p className="text-xs text-platinum-faint">
        Just browsing flips?{" "}
        <Link href="/" className="text-teal hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

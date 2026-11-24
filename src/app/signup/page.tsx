import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { safeNextPath } from "@/lib/auth/paths";
import { isPublicSignupEnabled } from "@/lib/auth/policy";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create account",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  if (await getAuthUser()) {
    redirect(next);
  }

  const signupsOpen = isPublicSignupEnabled();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <PageHeader
        title="Create account"
        description={
          signupsOpen
            ? "Pins and stash are yours. Everyone still sees the same scan of the market."
            : "Account registration is currently closed while Tenno Desk is in private mode."
        }
      />
      {signupsOpen ? (
        <AuthForm mode="signup" next={next} />
      ) : (
        <div className="flex flex-col gap-3 rounded-sm border border-line bg-void-raised p-4 text-sm text-platinum-dim">
          <p>
            Public signups are disabled for now. You can still browse all shared market boards
            without an account, or sign in if you already have one.
          </p>
          <p>
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="text-teal hover:underline"
            >
              Sign in to an existing account
            </Link>
          </p>
        </div>
      )}
      <p className="text-xs text-platinum-faint">
        <Link href="/" className="text-teal hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

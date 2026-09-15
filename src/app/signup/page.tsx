import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { safeNextPath } from "@/lib/auth/paths";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create account — WF Stocks",
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

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <PageHeader
        title="Create account"
        description="Pins and stash are yours. Everyone still sees the same scan of the market."
      />
      <AuthForm mode="signup" next={next} />
      <p className="text-xs text-platinum-faint">
        <Link href="/" className="text-teal hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

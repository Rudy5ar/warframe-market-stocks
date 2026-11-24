import Link from "next/link";

import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose new password",
};

export default async function ResetPasswordPage() {
  const user = await getAuthUser();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <PageHeader
        title="Choose a new password"
        description="Use at least 10 characters for your Tenno Desk account."
      />
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="flex flex-col gap-3 rounded-sm border border-line bg-void-raised p-4 text-sm text-platinum-dim">
          <p>Your password reset link is missing or has expired.</p>
          <p>
            <Link href="/forgot-password" className="text-teal hover:underline">
              Request a new reset link
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

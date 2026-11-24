import Link from "next/link";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAuthUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reset password",
};

export default async function ForgotPasswordPage() {
  if (await getAuthUser()) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <PageHeader
        title="Reset password"
        description="Enter your account email and we'll send you a link to pick a new password."
      />
      <ForgotPasswordForm />
      <p className="text-xs text-platinum-faint">
        <Link href="/" className="text-teal hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

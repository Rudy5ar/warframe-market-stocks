"use client";

import { useActionState } from "react";
import Link from "next/link";

import { requestPasswordReset, type AuthFormState } from "@/lib/auth/actions";

const INITIAL: AuthFormState = { error: null, message: null };

const fieldClass =
  "w-full rounded-lg border border-line bg-void-panel px-3.5 py-2 text-sm text-platinum placeholder:text-platinum-faint transition-colors hover:border-line-strong focus:border-gold";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-platinum-dim">
        Email
        <input
          className={fieldClass}
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </label>
      {state.error ? <p className="text-sm text-red">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-amber">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-void transition-colors hover:bg-gold/90 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-sm text-platinum-faint">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-gold hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

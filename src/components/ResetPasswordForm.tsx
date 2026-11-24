"use client";

import { useActionState } from "react";

import { updatePassword, type AuthFormState } from "@/lib/auth/actions";

const INITIAL: AuthFormState = { error: null, message: null };

const fieldClass =
  "w-full rounded-lg border border-line bg-void-panel px-3.5 py-2 text-sm text-platinum placeholder:text-platinum-faint transition-colors hover:border-line-strong focus:border-gold";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-platinum-dim">
        New password
        <input
          className={fieldClass}
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-platinum-dim">
        Confirm new password
        <input
          className={fieldClass}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={10}
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
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

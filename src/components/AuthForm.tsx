"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signIn, signUp, type AuthFormState } from "@/lib/auth/actions";

const INITIAL: AuthFormState = { error: null, message: null };

const fieldClass =
  "w-full rounded-lg border border-line bg-void-panel px-3.5 py-2 text-sm text-platinum placeholder:text-platinum-faint transition-colors hover:border-line-strong focus:border-gold";

export function AuthForm({
  mode,
  next,
  showSignupLink = true,
}: {
  mode: "login" | "signup";
  next: string;
  showSignupLink?: boolean;
}) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const otherHref =
    mode === "login"
      ? `/signup?next=${encodeURIComponent(next)}`
      : `/login?next=${encodeURIComponent(next)}`;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
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
      <label className="flex flex-col gap-1.5 text-sm text-platinum-dim">
        <span className="flex items-center justify-between">
          <span>Password</span>
          {mode === "login" ? (
            <Link href="/forgot-password" className="text-xs text-platinum-faint hover:text-teal">
              Forgot password?
            </Link>
          ) : null}
        </span>
        <input
          className={fieldClass}
          type="password"
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 10 : 1}
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
        {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      {mode === "signup" || showSignupLink ? (
        <p className="text-sm text-platinum-faint">
          {mode === "login" ? "No account yet?" : "Already have one?"}{" "}
          <Link href={otherHref} className="font-medium text-gold hover:underline">
            {mode === "login" ? "Create one" : "Sign in"}
          </Link>
        </p>
      ) : null}
    </form>
  );
}

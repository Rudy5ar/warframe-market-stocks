"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signIn, signUp, type AuthFormState } from "@/lib/auth/actions";

const INITIAL: AuthFormState = { error: null, message: null };

const fieldClass =
  "w-full rounded-sm border border-line bg-void-panel px-3 py-2 text-sm text-platinum placeholder:text-platinum-faint";

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "signup";
  next: string;
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
        Password
        <input
          className={fieldClass}
          type="password"
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={6}
          required
        />
      </label>
      {state.error ? <p className="text-sm text-red">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-amber">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm border border-teal-dim bg-teal-dim/10 px-3 py-2 text-sm font-medium text-teal transition-colors hover:bg-teal-dim/20 disabled:opacity-50"
      >
        {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-sm text-platinum-faint">
        {mode === "login" ? "No account yet?" : "Already have one?"}{" "}
        <Link href={otherHref} className="text-teal hover:underline">
          {mode === "login" ? "Create one" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}

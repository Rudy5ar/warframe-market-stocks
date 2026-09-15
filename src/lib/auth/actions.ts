"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createUserClient } from "@/lib/supabase/server";

import { safeNextPath } from "./paths";

export type AuthFormState = {
  error: string | null;
  message: string | null;
};

function readEmailPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));
  return { email, password, next };
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, next } = readEmailPassword(formData);
  if (!email || !password) {
    return { error: "Email and password are required.", message: null };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message, message: null };
  }

  redirect(next);
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, next } = readEmailPassword(formData);
  if (!email || !password) {
    return { error: "Email and password are required.", message: null };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters.", message: null };
  }

  const supabase = await createUserClient();
  const origin =
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return { error: error.message, message: null };
  }
  if (!data.session) {
    return {
      error: null,
      message: "Check your email to confirm the account, then sign in.",
    };
  }

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/");
}

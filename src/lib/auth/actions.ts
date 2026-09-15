"use server";

import { redirect } from "next/navigation";

import { createServiceClient, createUserClient } from "@/lib/supabase/server";

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

function isEmailUnconfirmed(message: string): boolean {
  return /email not confirmed/i.test(message);
}

function isAlreadyRegistered(message: string): boolean {
  return /already registered|already exists|already been registered/i.test(message);
}

/** ponytail: scans first 1k users; switch to admin get-by-email if the user list grows. */
async function confirmEmail(email: string): Promise<void> {
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return;
  const user = data.users.find((row) => row.email?.toLowerCase() === email.toLowerCase());
  if (!user || user.email_confirmed_at) return;
  await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
}

async function signInWithPassword(email: string, password: string) {
  const supabase = await createUserClient();
  let { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && isEmailUnconfirmed(error.message)) {
    await confirmEmail(email);
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  }
  return error;
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, next } = readEmailPassword(formData);
  if (!email || !password) {
    return { error: "Email and password are required.", message: null };
  }

  const error = await signInWithPassword(email, password);
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

  const admin = createServiceClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError && !isAlreadyRegistered(createError.message)) {
    return { error: createError.message, message: null };
  }

  const error = await signInWithPassword(email, password);
  if (error) {
    return { error: error.message, message: null };
  }

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/");
}

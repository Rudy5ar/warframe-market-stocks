"use server";

import { checkBotId } from "botid/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getProfileConfig } from "@/lib/config/profile";
import { createUserClient } from "@/lib/supabase/server";

import { safeNextPath } from "./paths";
import { isPublicSignupEnabled, MIN_PASSWORD_LENGTH } from "./policy";

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

async function resolveSiteOrigin(): Promise<string | null> {
  const { siteUrl } = getProfileConfig();
  if (siteUrl) {
    return siteUrl;
  }

  const hdrs = await headers();
  const origin = hdrs.get("origin");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      return null;
    }
  }
  return null;
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
    if (/email not confirmed/i.test(error.message)) {
      return {
        error: "Please confirm your email address before signing in.",
        message: null,
      };
    }
    return { error: "Invalid email or password.", message: null };
  }

  redirect(next);
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isPublicSignupEnabled()) {
    return { error: "Account registration is currently closed.", message: null };
  }

  const botCheck = await checkBotId();
  if (botCheck.isBot) {
    return { error: "Automated requests are not allowed.", message: null };
  }

  const { email, password, next } = readEmailPassword(formData);
  if (!email || !password) {
    return { error: "Email and password are required.", message: null };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      message: null,
    };
  }

  const supabase = await createUserClient();
  const origin = await resolveSiteOrigin();
  const emailRedirectTo = origin
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) {
    if (/rate limit|too many/i.test(error.message)) {
      return { error: "Too many attempts. Please try again later.", message: null };
    }
    if (/weak|pwned|breached|password/i.test(error.message)) {
      return { error: error.message, message: null };
    }
    return { error: "Could not create account. Please check your details and try again.", message: null };
  }

  if (data.session) {
    redirect(next);
  }

  return {
    error: null,
    message: "Check your email to confirm your account before signing in.",
  };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const botCheck = await checkBotId();
  if (botCheck.isBot) {
    return { error: "Automated requests are not allowed.", message: null };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Email is required.", message: null };
  }

  const supabase = await createUserClient();
  const origin = await resolveSiteOrigin();
  const redirectTo = origin ? `${origin}/auth/callback?next=/reset-password` : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    redirectTo ? { redirectTo } : undefined,
  );

  if (error && /rate limit|too many/i.test(error.message)) {
    return { error: "Too many attempts. Please try again later.", message: null };
  }

  return {
    error: null,
    message: "If an account exists for that email, we sent a password reset link.",
  };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      message: null,
    };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match.", message: null };
  }

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Your reset session has expired. Please request a new reset link.",
      message: null,
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message, message: null };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/");
}

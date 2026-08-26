"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/*
  Auth server actions.

  Rabbit Verse used to be one Google account behind an allowlist. It is now
  self-serve: anyone can create an account with an email and a password, and
  Google sign-in stays as the one-tap path. Access control moved from "is this
  the allowlisted address?" to "is this account suspended?" (`public.users.status`).
*/

export type AuthResult = {
  ok: boolean;
  error: string | null;
  /** A non-error message to show in place of the form, e.g. "check your inbox". */
  message: string | null;
};

const fail = (error: string): AuthResult => ({ ok: false, error, message: null });
const note = (message: string): AuthResult => ({ ok: true, error: null, message });

function originFrom(h: Headers) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

const MIN_PASSWORD = 8;

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

function validate(email: string, password: string): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
  return null;
}

/**
 * Supabase's messages are written for developers. Map the ones a user can
 * actually cause onto something calmer, and never confirm whether an address
 * has an account (that would be an enumeration oracle).
 */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Confirm your email first — check your inbox for the link.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Give it a minute and try again.";
  if (m.includes("password")) return "That password won't work — try a longer one.";
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Google (unchanged path, no allowlist)
// ---------------------------------------------------------------------------

/** Start Google OAuth (PKCE) and redirect the browser to the provider. */
export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = originFrom(await headers());

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}

// ---------------------------------------------------------------------------
// Email + password
// ---------------------------------------------------------------------------

/** Sign in with an existing email/password account. */
export async function signInWithPassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return fail("Enter your email and password.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail(friendly(error.message));

  // A suspended account may hold a valid password — the gate is the roster row.
  if (data.user && (await isSuspended(data.user.id))) {
    await supabase.auth.signOut();
    redirect("/suspended");
  }

  redirect("/");
}

/**
 * Create an account. The `handle_new_user()` trigger (migration 0004) writes the
 * roster row, the profile and the seed data inside the same transaction, so
 * either all of it exists or the account does not.
 */
export async function signUpWithPassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);

  const invalid = validate(email, password);
  if (invalid) return fail(invalid);
  if (password !== String(formData.get("confirm") ?? "")) return fail("Those passwords don't match.");

  const supabase = await createClient();
  const origin = originFrom(await headers());

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: name ? { name } : undefined,
    },
  });
  if (error) return fail(friendly(error.message));

  // Confirmation off (or an already-confirmed address): we have a session now.
  if (data.session) redirect("/");

  // Confirmation on. Supabase deliberately returns a decoy user with no
  // identities when the address already exists — telling the two cases apart
  // here would leak who has an account, so both get the same reply.
  return note("Check your inbox — we've sent you a link to confirm your account.");
}

/** Email a password-reset link. Always reports success, to avoid enumeration. */
export async function requestPasswordReset(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");

  const supabase = await createClient();
  const origin = originFrom(await headers());

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset")}`,
  });
  // A rate limit is worth surfacing; anything else must not reveal whether the
  // address is registered.
  if (error && /rate limit|too many/i.test(error.message)) return fail(friendly(error.message));

  return note("If that address has an account, a reset link is on its way.");
}

/** Set a new password. Requires the session the reset link established. */
export async function updatePassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return fail(`Use at least ${MIN_PASSWORD} characters.`);
  if (password !== String(formData.get("confirm") ?? "")) return fail("Those passwords don't match.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("That reset link has expired. Request a new one.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(friendly(error.message));

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------

/** Whether the roster marks this account suspended. Unknown/missing = allowed. */
async function isSuspended(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("status").eq("id", userId).maybeSingle();
  return data?.status === "suspended";
}

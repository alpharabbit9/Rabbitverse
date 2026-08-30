/*
  Is the door open?

  This is the one admin-adjacent read that is NOT admin-only: `/signup` asks it
  while signed out, and `signUpWithPassword` asks it again before it does
  anything. It lives here rather than in `lib/data/admin.ts` because that module
  is the panel's read surface and everything in it requires `is_admin()`.

  `signup_mode()` is a `security definer` function granted to `anon` that returns
  one word (`0007_admin.sql`), so the anon key can ask without being able to read
  `app_settings` itself.

  FAILS OPEN, TWICE OVER. The SQL coalesces a missing settings row to 'open', and
  the catch below turns any error at all — the migration not applied yet, a
  network blip, a typo'd function name — into 'open' as well. A signup gate that
  fails *closed* would lock every future user out of an app nobody can un-break
  from inside, and the worst case of failing open is the state the app shipped in
  for its whole life so far.

  Not `React.cache()`d on purpose: it is one cheap call on two routes, and a
  cached "open" would outlive an admin flipping the switch mid-request.
*/

import { toSignupMode } from "@/lib/admin/roles";
import type { SignupMode } from "@/lib/admin/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Next signals control flow by THROWING — a redirect, a 404, and above all
 * "this render cannot be static" all arrive as errors carrying a `digest`. A
 * fail-open catch that swallowed one of those would hide the bail-out and leave
 * a page prerendered with whatever answer the build happened to get. They go
 * back up untouched; only genuine failures below fall through to the default.
 */
function rethrowFrameworkErrors(e: unknown): void {
  if (typeof (e as { digest?: unknown } | null)?.digest === "string") throw e;
}

export async function getSignupMode(): Promise<SignupMode> {
  if (!isSupabaseConfigured) return "open";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("signup_mode");
    if (error) throw new Error(error.message);
    return toSignupMode(data);
  } catch (e) {
    rethrowFrameworkErrors(e);
    console.error("[signup] could not read signup_mode()", e instanceof Error ? e.message : e);
    return "open";
  }
}

/**
 * Whether this code (or this address) can currently admit somebody.
 *
 * Cosmetic only — it exists so `/signup` can say "that code isn't valid" instead
 * of surfacing `Database error saving new user` after the round trip. The
 * decision is made by `consume_invite()` inside the signup transaction, which
 * re-reads everything under a row lock.
 *
 * Fails OPEN for the same reason as above: if the check itself is broken, let
 * the trigger be the judge rather than turning away somebody with a good code.
 */
export async function inviteLooksValid(code: string, email: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("invite_check", {
      p_code: code || null,
      p_email: email || null,
    });
    if (error) throw new Error(error.message);
    return data !== false;
  } catch (e) {
    rethrowFrameworkErrors(e);
    console.error("[signup] could not read invite_check()", e instanceof Error ? e.message : e);
    return true;
  }
}

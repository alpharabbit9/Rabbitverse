/*
  The per-request session: who is signed in, and the locale everything they see
  is rendered in.

  Server-only — it uses the cookie-bound Supabase client, so it may only be
  imported from Server Components, Route Handlers and Server Actions.

  Wrapped in `React.cache()`, so the profile is read **once per request** no
  matter how many fetchers ask for it. Before this, `getTargets()` alone ran two
  or three times on every route because each caller opened its own query.
  `cache()` is per-request, so there is no staleness risk: a Server Action that
  writes the profile and calls `revalidatePath` gets a fresh read next request.
*/
import { cache } from "react";
import { resolveMascot, type MascotSpecies } from "@/components/mascot/types";
import { todayIn } from "@/lib/dates";
import {
  DEFAULT_LOCALE_CONTEXT,
  type LocaleContext,
  normalizeLocaleContext,
} from "@/lib/locale";
import { toUserRole, toUserStatus } from "@/lib/admin/roles";
import type { UserRole, UserStatus } from "@/lib/admin/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type { UserRole, UserStatus };

export interface AppSession extends LocaleContext {
  userId: string;
  email: string | null;
  /** Display name, already falling back through profile → OAuth metadata → email local-part. */
  name: string;
  avatarUrl: string | null;
  /** Already coerced to a species the registry can draw. */
  mascot: MascotSpecies;
  status: UserStatus;
  role: UserRole;
  /**
   * The single answer to "may this person open /admin?" — mirroring the SQL
   * `is_admin()` exactly, suspension included, so the two can never disagree.
   */
  isAdmin: boolean;
}

/**
 * The signed-in user's session, or `null` when nobody is signed in (or Supabase
 * isn't configured at all, i.e. local demo mode).
 */
export const getSession = cache(async (): Promise<AppSession | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // `public.users` and `public.user_profiles` both key off auth.users rather
  // than each other, so PostgREST cannot infer a join — two reads it is. They
  // run in parallel and only once per request.
  const [{ data: profile }, { data: roster }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("display_name, avatar_url, mascot, timezone, currency, locale")
      .eq("id", user.id)
      .maybeSingle(),
    // `role` rides along in a query that already runs every request, so admin
    // status costs nothing extra and — unlike a JWT claim — is never stale.
    supabase.from("users").select("status, role").eq("id", user.id).maybeSingle(),
  ]);

  const status = toUserStatus(roster?.status);
  const role = toUserRole(roster?.role);

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaString = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : "");

  const fullName =
    (profile?.display_name as string | undefined) ||
    metaString("full_name") ||
    metaString("name") ||
    (user.email ? user.email.split("@")[0] : "") ||
    "Friend";

  return {
    userId: user.id,
    email: user.email ?? null,
    name: fullName.split(" ")[0] || fullName,
    avatarUrl:
      (profile?.avatar_url as string | undefined) ||
      metaString("avatar_url") ||
      metaString("picture") ||
      null,
    mascot: resolveMascot(profile?.mascot),
    status,
    role,
    isAdmin: role === "admin" && status === "active",
    ...normalizeLocaleContext({
      tz: profile?.timezone,
      currency: profile?.currency,
      locale: profile?.locale,
    }),
  };
});

/**
 * The locale to render this request in: the signed-in user's, or the app
 * defaults in demo mode / when signed out.
 */
export const getLocaleContext = cache(async (): Promise<LocaleContext> => {
  const session = await getSession();
  if (!session) return DEFAULT_LOCALE_CONTEXT;
  return { tz: session.tz, currency: session.currency, locale: session.locale };
});

/**
 * "Today" as this user's calendar sees it — the replacement for every former
 * `dhakaToday()` call. Server pages and actions must take their day from here
 * so a user in New York rolls over at NY midnight, not Dhaka's.
 */
export async function currentDay(now: Date = new Date()): Promise<string> {
  const { tz } = await getLocaleContext();
  return todayIn(tz, now);
}

/*
  The two ways into the admin panel, and the only two.

  `requireAdmin()` guards a page or layout; `assertAdmin()` guards a Server
  Action. They ask the same question of the same source — `getSession().isAdmin`,
  which mirrors the SQL `is_admin()` down to "a suspended admin is not an admin".

  WHY 404 AND NOT 403. A member who tries `/admin` is told the page does not
  exist, not that it exists and is barred: there is no reason to teach anyone
  that the route is there. It also sidesteps Next 16's `forbidden()`, which needs
  `experimental.authInterrupts` turned on.

  The proxy blocks `/admin*` at the edge as well, but this is the authoritative
  gate — the proxy is an optimisation in front of it, not a replacement for it.

  Server-only: it reads the cookie-bound session.
*/

import { notFound } from "next/navigation";
import { getSession, type AppSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The session, guaranteed to be an active admin. Anything else — signed out, a
 * member, a suspended admin, or demo mode (which has no accounts at all) —
 * terminates the render with a 404.
 */
export async function requireAdmin(): Promise<AppSession> {
  if (!isSupabaseConfigured) notFound();

  const session = await getSession();
  if (!session?.isAdmin) notFound();

  return session;
}

export type AdminGuardResult =
  | { ok: true; session: AppSession }
  | { ok: false; error: string };

/**
 * The Server Action flavour. Actions return `{ ok, error }` rather than throwing
 * a routing interrupt, so this hands back a refusal the caller can return
 * verbatim.
 *
 * The message is deliberately vague for the same reason the page 404s.
 */
export async function assertAdmin(): Promise<AdminGuardResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "Not available." };

  const session = await getSession();
  if (!session?.isAdmin) return { ok: false, error: "Not available." };

  return { ok: true, session };
}

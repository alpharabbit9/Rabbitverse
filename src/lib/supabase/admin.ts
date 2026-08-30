/*
  The service-role Supabase client — the most dangerous module in the app.

  It holds a key that bypasses Row Level Security entirely. One import from a
  client component and the key is in a browser bundle; one `.select("*")` on a
  content table and somebody's journal is on screen. So:

  * `createAdminClient()` IS CALLED FROM EXACTLY ONE FILE —
    `app/(admin)/admin/actions.ts`. (The `isServiceRoleConfigured` flag beside it
    is an inert boolean; the admin layout reads it to draw its banner.)
    The admin panel's *reads* deliberately do not use it: they go through the
    `admin_user_stats` / `admin_overview` RPCs on the ordinary cookie client,
    whose return signatures are bigint counts and cannot carry user content.
    This client only ever WRITES.

  Three layers keep it off the client:

    1. `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix, so Next never
       inlines it into a browser bundle — the value would be `undefined` there
       regardless of what imported it.
    2. The `typeof window` throw below turns a mis-import into a loud crash
       instead of a silent no-op.
    3. `npm run build` fails if a `"use client"` module imports this file.

  The project does not install the `server-only` package; the boundary is kept
  by convention here exactly as it is in `groq.ts`, `redis.ts` and the data layer.

  WHEN UNSET: reads still work (they are RPC-based on the anon key), so the panel
  renders and stays useful. Every write short-circuits with a clear error and the
  admin layout shows a persistent amber banner. A read-only admin panel is a
  reasonable state; a panel whose buttons silently do nothing is not.
*/

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Whether admin *writes* are possible at all. Reads never need this. */
export const isServiceRoleConfigured = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

/**
 * A Supabase client that bypasses RLS. Server-side only, and only for the
 * moderation writes in `app/(admin)/admin/actions.ts`.
 *
 * Throws rather than returning null: every caller checks
 * `isServiceRoleConfigured` first, so reaching here unconfigured is a bug worth
 * seeing in the logs.
 */
export function createAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() was called in the browser. The service-role key must never reach a client bundle.");
  }
  if (!isServiceRoleConfigured) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — admin writes are unavailable.");
  }

  return createSupabaseClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    // No cookie jar, no refresh loop, no URL parsing: this client is a
    // short-lived, request-scoped hammer, not a session.
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

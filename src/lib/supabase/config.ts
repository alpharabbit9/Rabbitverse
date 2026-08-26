/* Central Supabase config + the "is it wired yet?" flag. */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasKeys = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Demo mode: the app runs on sample data with no auth and no database.
 *
 * It is **local development only**. Rabbit Verse used to be private to one
 * person, so serving sample data to a signed-out visitor was harmless. Now that
 * anyone can sign up, a deployed instance must send a signed-out visitor to
 * `/login` — never to a dashboard full of somebody else's shaped-up data. So
 * `NEXT_PUBLIC_DEMO_MODE` is honoured only outside production; in production the
 * only thing that turns demo mode on is having no Supabase keys at all.
 */
export const DEMO_MODE =
  !hasKeys || (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true");

/** When false, the app runs in demo mode on sample data (no auth, no DB). */
export const isSupabaseConfigured = !DEMO_MODE;

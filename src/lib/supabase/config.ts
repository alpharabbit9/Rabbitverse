/* Central Supabase config + the "is it wired yet?" flag. */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** When false, the app runs in demo mode on sample data (no auth, no DB). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Single-email allowlist. Rabbit Verse is private to one person — only this
 * Google account may complete sign-in. Checked server-side in the auth callback.
 */
export const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL ?? "").toLowerCase();

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PushSubscriptionPayload } from "@/lib/push";
import { DEFAULT_TARGETS, TARGET_KEYS, type Targets, coerceTarget } from "@/lib/targets";
import { isValidLocale, isValidTimeZone } from "@/lib/locale";
import { isValidCurrency } from "@/lib/money";
import { MASCOT_SPECIES, type MascotSpecies } from "@/components/mascot/types";
import {
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  isCategoryColor,
  isCategoryIcon,
  isDuplicateName,
  normalizeCategoryName,
} from "@/lib/categories";

export type ActionResult = { ok: boolean; error: string | null };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Store (or refresh) this device's push subscription. Endpoint is unique per device. */
export async function savePushSubscription(sub: PushSubscriptionPayload): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!sub?.endpoint || !sub.p256dh || !sub.auth) return { ok: false, error: "Incomplete subscription." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, error: null };
}

/** Remove a device's push subscription (on disable / unsubscribe). */
export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!endpoint) return { ok: true, error: null };

  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, error: null };
}

/** Save the daily reminder time (user-local "HH:MM") into user_profiles.settings. */
export async function saveReminderTime(time: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: "Enter a valid time." };

  const { data: prof } = await supabase.from("user_profiles").select("settings").maybeSingle();
  const settings = { ...(prof?.settings as Record<string, unknown> | null), reminderTime: time };

  const { error } = await supabase.from("user_profiles").update({ settings }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, error: null };
}

/**
 * Save the user's targets into `user_profiles.settings.targets` — same JSONB store
 * `reminderTime` uses, so no migration. Every field is re-coerced server-side
 * (clamped to `TARGET_LIMITS`, or nulled to mean "no target") so a tampered
 * payload can't park a nonsense cap in the profile.
 */
export async function saveTargets(input: Partial<Record<keyof Targets, unknown>>): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!input || typeof input !== "object") return { ok: false, error: "Nothing to save." };

  const targets: Targets = { ...DEFAULT_TARGETS };
  for (const key of TARGET_KEYS) targets[key] = coerceTarget(key, input[key]);

  const { data: prof } = await supabase.from("user_profiles").select("settings").maybeSingle();
  const settings = { ...(prof?.settings as Record<string, unknown> | null), targets };

  const { error } = await supabase.from("user_profiles").update({ settings }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  // Targets change what every dashboard warns about, so refresh them all.
  for (const path of ["/settings", "/", "/expenses", "/workout", "/projects", "/mental-health"]) {
    revalidatePath(path);
  }
  return { ok: true, error: null };
}

/**
 * Save the user's timezone / currency / language tag.
 *
 * Both values are validated against the runtime's own ICU data rather than a
 * hand-kept list, so anything `Intl` can format is accepted and anything it
 * can't is refused before it reaches the column.
 *
 * Changing the timezone does **not** rewrite history: stored dates are
 * already-committed ISO day strings, and re-bucketing them would silently move
 * entries between days. The new zone applies from the next log onward.
 */
export async function saveLocale(input: {
  timezone?: unknown;
  currency?: unknown;
  locale?: unknown;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!input || typeof input !== "object") return { ok: false, error: "Nothing to save." };

  const patch: Record<string, string> = {};
  if (input.timezone !== undefined) {
    if (!isValidTimeZone(input.timezone)) return { ok: false, error: "That isn't a timezone I know." };
    patch.timezone = input.timezone;
  }
  if (input.currency !== undefined) {
    if (!isValidCurrency(input.currency)) return { ok: false, error: "That isn't a currency code I know." };
    patch.currency = input.currency.toUpperCase();
  }
  if (input.locale !== undefined) {
    if (!isValidLocale(input.locale)) return { ok: false, error: "That isn't a language tag I know." };
    patch.locale = input.locale;
  }
  if (!Object.keys(patch).length) return { ok: true, error: null };

  const { error } = await supabase.from("user_profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  // Timezone changes what "today" means and currency changes every amount, so
  // every dashboard has to be rebuilt.
  for (const path of ["/settings", "/", "/expenses", "/workout", "/projects", "/mental-health", "/quick-add"]) {
    revalidatePath(path);
  }
  return { ok: true, error: null };
}

/**
 * Save the user's mascot — the creature that appears in the page header and on
 * the "<Mascot> says" card. Validated against the registry's own species list,
 * so a tampered post cannot park a value the app has no drawing for; unknown
 * values already fall back to the rabbit on read, but there is no reason to let
 * one into the column in the first place.
 */
export async function saveMascot(species: unknown): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (typeof species !== "string" || !(MASCOT_SPECIES as readonly string[]).includes(species)) {
    return { ok: false, error: "That isn't one of the mascots." };
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ mascot: species as MascotSpecies })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  // The mascot is seeded in the (app) layout, so every route under it renders
  // the old creature until its cache entry is dropped.
  for (const path of ["/settings", "/", "/expenses", "/workout", "/projects", "/mental-health", "/quick-add"]) {
    revalidatePath(path);
  }
  return { ok: true, error: null };
}

/*
  ---- Spend categories -----------------------------------------------------

  The categories a user logs against are theirs to shape: six are seeded on
  signup (`is_preset`), and everything after that is their own. Name, colour and
  icon are editable on all of them; only non-preset ones can be deleted, so the
  AI parser and the six seeded buckets always have somewhere to land.

  Every field is re-validated here against `lib/categories.ts` — the colour goes
  into a `style` attribute and the icon into a component lookup, so neither may
  be free text from the client.
*/

/** Paths whose category chips / breakdowns change when a category does. */
const CATEGORY_PATHS = ["/settings", "/expenses", "/quick-add", "/"];

function revalidateCategories() {
  for (const path of CATEGORY_PATHS) revalidatePath(path);
}

/** Add one of the user's own categories. */
export async function createCategory(input: { name: unknown; color: unknown; icon: unknown }): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const name = normalizeCategoryName(input?.name);
  if (!name) return { ok: false, error: "Give the category a name." };
  const color = isCategoryColor(input?.color) ? (input.color as string) : DEFAULT_CATEGORY_COLOR;
  const icon = isCategoryIcon(input?.icon) ? input.icon : DEFAULT_CATEGORY_ICON;

  const { data: existing } = await supabase.from("expense_categories").select("name");
  if (isDuplicateName(name, (existing ?? []).map((c) => String(c.name)))) {
    return { ok: false, error: `You already have a "${name}" category.` };
  }

  const { error } = await supabase
    .from("expense_categories")
    .insert({ user_id: user.id, name, color, icon, is_preset: false });
  if (error) return { ok: false, error: error.message };

  revalidateCategories();
  return { ok: true, error: null };
}

/** Rename / recolour / re-icon a category (presets included). */
export async function updateCategory(input: {
  id: unknown;
  name?: unknown;
  color?: unknown;
  icon?: unknown;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (typeof input?.id !== "string" || !input.id) return { ok: false, error: "Which category?" };

  const patch: Record<string, string> = {};
  if (input.name !== undefined) {
    const name = normalizeCategoryName(input.name);
    if (!name) return { ok: false, error: "Give the category a name." };
    const { data: existing } = await supabase.from("expense_categories").select("name").neq("id", input.id);
    if (isDuplicateName(name, (existing ?? []).map((c) => String(c.name)))) {
      return { ok: false, error: `You already have a "${name}" category.` };
    }
    patch.name = name;
  }
  if (input.color !== undefined) {
    if (!isCategoryColor(input.color)) return { ok: false, error: "That isn't one of the colours." };
    patch.color = input.color as string;
  }
  if (input.icon !== undefined) {
    if (!isCategoryIcon(input.icon)) return { ok: false, error: "That isn't one of the icons." };
    patch.icon = input.icon;
  }
  if (!Object.keys(patch).length) return { ok: true, error: null };

  const { error } = await supabase.from("expense_categories").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidateCategories();
  return { ok: true, error: null };
}

/**
 * Delete one of the user's own categories. The expenses filed under it are
 * **kept** — `expenses.category_id` is `on delete set null`, so the amounts stay
 * in every total and only lose their label. Presets are refused: they are the
 * floor the AI parser and the seeded buckets rely on.
 */
export async function deleteCategory(id: unknown): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (typeof id !== "string" || !id) return { ok: false, error: "Which category?" };

  const { data: row } = await supabase.from("expense_categories").select("is_preset").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "That category is already gone." };
  if (row.is_preset) return { ok: false, error: "The starter categories can be renamed, but not deleted." };

  const { error } = await supabase.from("expense_categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateCategories();
  return { ok: true, error: null };
}

/**
 * Backfill the default categories and workout plan for an account whose signup
 * trigger seeded neither. The seeds live in a swallow-all exception block in
 * `handle_new_user()` (migration 0004) precisely so a seed failure can never
 * cost somebody their account — this is the recovery path for that case.
 * Idempotent: it does nothing when either set already exists.
 */
export async function seedProfileDefaults(): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const [{ count: catCount }, { count: planCount }] = await Promise.all([
    supabase.from("expense_categories").select("id", { count: "exact", head: true }),
    supabase.from("workout_plan_days").select("id", { count: "exact", head: true }),
  ]);

  if (!catCount) {
    const { error } = await supabase.from("expense_categories").insert(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id, is_preset: true })),
    );
    if (error) return { ok: false, error: error.message };
  }
  if (!planCount) {
    const { error } = await supabase
      .from("workout_plan_days")
      .insert(DEFAULT_PLAN.map((d) => ({ ...d, user_id: user.id })));
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/expenses");
  revalidatePath("/workout");
  return { ok: true, error: null };
}

/** Mirrors the seeds in migration 0004's `handle_new_user()`. */
const DEFAULT_CATEGORIES = [
  { name: "Food", color: "var(--accent-mint)", icon: "Utensils" },
  { name: "Transport", color: "var(--accent-blue)", icon: "Bus" },
  { name: "Shopping", color: "var(--accent-purple)", icon: "ShoppingBag" },
  { name: "Bills", color: "var(--accent-gold)", icon: "ReceiptText" },
  { name: "Health", color: "var(--accent-orange)", icon: "HeartPulse" },
  { name: "Other", color: "var(--accent-cyan)", icon: "Sparkles" },
];

const DEFAULT_PLAN = [
  { weekday: 0, label: "Push", focus: "Chest · Shoulders · Triceps" },
  { weekday: 1, label: "Pull", focus: "Back · Biceps" },
  { weekday: 2, label: "Legs", focus: "Quads · Hamstrings · Calves" },
  { weekday: 3, label: "Rest", focus: "Mobility & stretching" },
  { weekday: 4, label: "Upper", focus: "Chest · Back" },
  { weekday: 5, label: "Cardio", focus: "Run · Core" },
  { weekday: 6, label: "Rest", focus: "Recovery walk" },
];

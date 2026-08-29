"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "@/lib/dates";
import { currentDay } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type LogResult = { ok: boolean; error: string | null };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateAll() {
  revalidatePath("/workout");
  revalidatePath("/");
}

/**
 * Record whether a session happened (upsert one row per day). Defaults to today
 * — the Workout page's form posts no date — but accepts `log_date` so the AI box
 * can log "yesterday: rest day" against the right day instead of stamping today.
 * Same today+yesterday window the expense and journal actions enforce.
 */
export async function setWorkoutDay(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const done = formData.get("done") === "true";
  const planLabel = ((formData.get("plan_label") as string) || "").slice(0, 40) || null;

  const today = await currentDay();
  const logDate = (formData.get("log_date") as string) || today;
  if (logDate !== today && logDate !== addDays(today, -1)) {
    return { ok: false, error: "You can only log today or yesterday." };
  }

  const { error } = await supabase
    .from("workout_logs")
    .upsert({ user_id: user.id, log_date: logDate, done, plan_label: planLabel }, { onConflict: "user_id,log_date" });
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

/**
 * Log a day's body weight (and optional body-fat %) — upsert one row per day.
 * Defaults to today — the Workout page's form posts no date — but accepts
 * `log_date` so the AI box can file "yesterday I weighed 78.5kg" against the
 * right day. Same today+yesterday window every other logging action enforces.
 */
export async function logWeight(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const weight = Number(formData.get("weight"));
  if (!weight || weight <= 0) return { ok: false, error: "Enter a weight greater than 0." };
  const bfRaw = formData.get("body_fat");
  const bodyFat = bfRaw ? Number(bfRaw) : null;

  const today = await currentDay();
  const logDate = (formData.get("log_date") as string) || today;
  if (logDate !== today && logDate !== addDays(today, -1)) {
    return { ok: false, error: "You can only log today or yesterday." };
  }

  const { error } = await supabase
    .from("body_metrics")
    .upsert(
      { user_id: user.id, log_date: logDate, weight_kg: weight, body_fat_pct: bodyFat && bodyFat > 0 ? bodyFat : null },
      { onConflict: "user_id,log_date" },
    );
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

/** Set the profile height (cm) — a one-time body stat that unlocks the BMI number. */
export async function saveHeight(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const height = Number(formData.get("height"));
  if (!height || height < 50 || height > 260) return { ok: false, error: "Enter a height in cm (50–260)." };

  const { error } = await supabase.from("user_profiles").update({ height_cm: height }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

/**
 * Set one weekday of the training split — the labels the "Today's session" card
 * and every logged row carry ("Push", "Legs", "Rest"). Upserts on
 * `unique (user_id, weekday)`, so a day is written once and edited in place.
 *
 * Changing the plan does **not** rewrite history: `workout_logs.plan_label` is
 * copied at log time on purpose, so a past Tuesday still says what you actually
 * trained that day.
 */
export async function saveWorkoutPlanDay(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const weekday = Number(formData.get("weekday"));
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { ok: false, error: "Which day?" };

  const label = ((formData.get("label") as string) || "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!label) return { ok: false, error: "Give the day a name — 'Push', 'Rest', anything." };
  const focus = ((formData.get("focus") as string) || "").replace(/\s+/g, " ").trim().slice(0, 80);

  const { error } = await supabase
    .from("workout_plan_days")
    .upsert({ user_id: user.id, weekday, label, focus: focus || null }, { onConflict: "user_id,weekday" });
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

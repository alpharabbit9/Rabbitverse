"use server";

import { revalidatePath } from "next/cache";
import { dhakaToday } from "@/lib/dates";
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

/** Record whether today's workout happened (upsert one row per day). */
export async function setTodayWorkout(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const done = formData.get("done") === "true";
  const planLabel = ((formData.get("plan_label") as string) || "").slice(0, 40) || null;

  const { error } = await supabase
    .from("workout_logs")
    .upsert({ user_id: user.id, log_date: dhakaToday(), done, plan_label: planLabel }, { onConflict: "user_id,log_date" });
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

/** Log today's body weight (and optional body-fat %) — upsert one row per day. */
export async function logWeight(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const weight = Number(formData.get("weight"));
  if (!weight || weight <= 0) return { ok: false, error: "Enter a weight greater than 0." };
  const bfRaw = formData.get("body_fat");
  const bodyFat = bfRaw ? Number(bfRaw) : null;

  const { error } = await supabase
    .from("body_metrics")
    .upsert(
      { user_id: user.id, log_date: dhakaToday(), weight_kg: weight, body_fat_pct: bodyFat && bodyFat > 0 ? bodyFat : null },
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

  const { error } = await supabase.from("profiles").update({ height_cm: height }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

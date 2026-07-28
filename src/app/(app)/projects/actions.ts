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
  revalidatePath("/projects");
  revalidatePath("/");
}

/** Create a new project with a self-defined target. */
export async function createProject(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { ok: false, error: "Give your project a name." };

  const targetValue = Number(formData.get("target_value"));
  if (!targetValue || targetValue <= 0) return { ok: false, error: "Set a target greater than 0." };

  const targetUnit = ((formData.get("target_unit") as string) || "%").trim() || "%";
  const description = ((formData.get("description") as string) || "").trim().slice(0, 300) || null;

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name: name.slice(0, 120),
    description,
    target_value: targetValue,
    target_unit: targetUnit,
    current_value: 0,
    status: "ongoing",
    start_date: dhakaToday(),
  });
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

/** Add progress to a project today: bump current_value + record today's log for the heatmap. */
export async function logProgress(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const projectId = (formData.get("project_id") as string) || "";
  const amount = Number(formData.get("amount"));
  if (!projectId) return { ok: false, error: "Missing project." };
  if (!amount || amount === 0) return { ok: false, error: "Enter a progress amount." };

  const { data: proj, error: readErr } = await supabase
    .from("projects")
    .select("current_value,target_value")
    .eq("id", projectId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!proj) return { ok: false, error: "Project not found." };

  const newCurrent = Math.max(0, Number(proj.current_value) + amount);
  const completed = newCurrent >= Number(proj.target_value);

  const { error: updErr } = await supabase
    .from("projects")
    .update({ current_value: newCurrent, status: completed ? "completed" : "ongoing" })
    .eq("id", projectId);
  if (updErr) return { ok: false, error: updErr.message };

  // One log row per project per day — accumulate if we already logged today.
  const today = dhakaToday();
  const { data: existing } = await supabase
    .from("project_logs")
    .select("id,progress_amount")
    .eq("project_id", projectId)
    .eq("log_date", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("project_logs")
      .update({ progress_amount: Number(existing.progress_amount) + amount })
      .eq("id", existing.id);
  } else {
    await supabase.from("project_logs").insert({ user_id: user.id, project_id: projectId, log_date: today, progress_amount: amount });
  }

  revalidateAll();
  return { ok: true, error: null };
}

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

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/");
}

/**
 * Recompute a project's progress from its checklist. When a project has tasks,
 * current_value becomes the percent done (0–100) with a 100/% target, so the
 * ring and every downstream signal (life-score, goals view) read it correctly.
 * Projects without tasks keep their numeric target untouched.
 */
async function recomputeProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<void> {
  const { data: tasks } = await supabase.from("project_tasks").select("done").eq("project_id", projectId);
  const total = tasks?.length ?? 0;
  if (total === 0) return; // no checklist → leave numeric progress as-is
  const done = (tasks ?? []).filter((t) => t.done).length;
  const pct = Math.round((done / total) * 100);
  await supabase
    .from("projects")
    .update({ current_value: pct, target_value: 100, target_unit: "%", status: done === total ? "completed" : "ongoing" })
    .eq("id", projectId);
}

/**
 * Create a new project. `target_value` is optional now — task-based projects
 * default to a 0–100% goal; the Quick-Add "New goal" form still passes an
 * explicit numeric target/unit and that path is preserved.
 */
export async function createProject(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { ok: false, error: "Give your project a name." };

  const targetRaw = Number(formData.get("target_value"));
  const targetValue = targetRaw && targetRaw > 0 ? targetRaw : 100;
  const targetUnit = ((formData.get("target_unit") as string) || "%").trim() || "%";
  const description = ((formData.get("description") as string) || "").trim().slice(0, 300) || null;
  const goals = ((formData.get("goals") as string) || "").trim().slice(0, 2000) || null;
  const targetDateRaw = ((formData.get("target_date") as string) || "").trim();
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(targetDateRaw) ? targetDateRaw : null;

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name: name.slice(0, 120),
    description,
    goals,
    target_value: targetValue,
    target_unit: targetUnit,
    current_value: 0,
    status: "ongoing",
    start_date: dhakaToday(),
    target_date: targetDate,
  });
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

/** Add a task/milestone to a project's checklist. */
export async function addTask(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const projectId = (formData.get("project_id") as string) || "";
  const title = ((formData.get("title") as string) || "").trim().slice(0, 200);
  if (!projectId) return { ok: false, error: "Missing project." };
  if (!title) return { ok: false, error: "Name the task first." };

  const { count } = await supabase
    .from("project_tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { error } = await supabase
    .from("project_tasks")
    .insert({ user_id: user.id, project_id: projectId, title, position: count ?? 0 });
  if (error) return { ok: false, error: error.message };

  await recomputeProgress(supabase, projectId);
  revalidateProject(projectId);
  return { ok: true, error: null };
}

/** Tick / untick a task, then refresh the project's percent. */
export async function toggleTask(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const taskId = (formData.get("task_id") as string) || "";
  const done = (formData.get("done") as string) === "true";
  if (!taskId) return { ok: false, error: "Missing task." };

  const { data: task } = await supabase.from("project_tasks").select("project_id").eq("id", taskId).maybeSingle();
  if (!task) return { ok: false, error: "Task not found." };

  const { error } = await supabase
    .from("project_tasks")
    .update({ done, done_at: done ? dhakaToday() : null })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  await recomputeProgress(supabase, String(task.project_id));
  revalidateProject(String(task.project_id));
  return { ok: true, error: null };
}

/** Remove a task, then refresh the project's percent. */
export async function deleteTask(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const taskId = (formData.get("task_id") as string) || "";
  if (!taskId) return { ok: false, error: "Missing task." };

  const { data: task } = await supabase.from("project_tasks").select("project_id").eq("id", taskId).maybeSingle();
  if (!task) return { ok: false, error: "Task not found." };

  const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  await recomputeProgress(supabase, String(task.project_id));
  revalidateProject(String(task.project_id));
  return { ok: true, error: null };
}

/**
 * Log a written progress update ("commit"). One row per project per day — a
 * second update the same day appends to that day's note, so the number of rows
 * equals the number of distinct days worked on the project.
 */
export async function addCommit(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const projectId = (formData.get("project_id") as string) || "";
  const note = ((formData.get("note") as string) || "").trim().slice(0, 2000);
  if (!projectId) return { ok: false, error: "Missing project." };
  if (!note) return { ok: false, error: "Write what you got done." };

  const today = dhakaToday();
  const { data: existing } = await supabase
    .from("project_logs")
    .select("id,note")
    .eq("project_id", projectId)
    .eq("log_date", today)
    .maybeSingle();

  if (existing) {
    const merged = existing.note ? `${existing.note}\n${note}` : note;
    const { error } = await supabase.from("project_logs").update({ note: merged }).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("project_logs")
      .insert({ user_id: user.id, project_id: projectId, log_date: today, progress_amount: 0, note });
    if (error) return { ok: false, error: error.message };
  }

  revalidateProject(projectId);
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

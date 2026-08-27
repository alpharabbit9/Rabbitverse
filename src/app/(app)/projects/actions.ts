"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/**
 * Resolve an optional `log_date` against the today+yesterday window every other
 * logging action enforces. Returns the error string when it's out of range, so
 * callers can bail with the same message the expense and journal actions use.
 */
async function resolveLogDate(formData: FormData): Promise<{ date: string } | { error: string }> {
  const today = await currentDay();
  const date = (formData.get("log_date") as string) || today;
  if (date !== today && date !== addDays(today, -1)) {
    return { error: "You can only log today or yesterday." };
  }
  return { date };
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
    start_date: await currentDay(),
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
    .update({ done, done_at: done ? await currentDay() : null })
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
 * equals the number of distinct days worked on the project. Defaults to today,
 * but accepts `log_date` so yesterday's work can be written up this morning.
 */
export async function addCommit(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const projectId = (formData.get("project_id") as string) || "";
  const note = ((formData.get("note") as string) || "").trim().slice(0, 2000);
  if (!projectId) return { ok: false, error: "Missing project." };
  if (!note) return { ok: false, error: "Write what you got done." };

  const when = await resolveLogDate(formData);
  if ("error" in when) return { ok: false, error: when.error };

  const { data: existing } = await supabase
    .from("project_logs")
    .select("id,note")
    .eq("project_id", projectId)
    .eq("log_date", when.date)
    .maybeSingle();

  if (existing) {
    const merged = existing.note ? `${existing.note}\n${note}` : note;
    const { error } = await supabase.from("project_logs").update({ note: merged }).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("project_logs")
      .insert({ user_id: user.id, project_id: projectId, log_date: when.date, progress_amount: 0, note });
    if (error) return { ok: false, error: error.message };
  }

  revalidateProject(projectId);
  return { ok: true, error: null };
}

/**
 * Add progress to a project: bump current_value + record that day's log for the
 * heatmap. Defaults to today, but honours `log_date` within the today+yesterday
 * window like every other logging action.
 */
export async function logProgress(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const projectId = (formData.get("project_id") as string) || "";
  const amount = Number(formData.get("amount"));
  if (!projectId) return { ok: false, error: "Missing project." };
  if (!amount || amount === 0) return { ok: false, error: "Enter a progress amount." };

  const when = await resolveLogDate(formData);
  if ("error" in when) return { ok: false, error: when.error };

  const { data: proj, error: readErr } = await supabase
    .from("projects")
    .select("current_value,target_value")
    .eq("id", projectId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!proj) return { ok: false, error: "Project not found." };

  // A project with a checklist gets its percentage from `recomputeProgress`, so
  // bumping current_value here would move the ring only until the next task is
  // ticked — and every warning quoting that percentage with it. Numeric
  // progress belongs to projects that have no checklist.
  const { count: taskCount } = await supabase
    .from("project_tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (taskCount) {
    return { ok: false, error: "This project's progress comes from its checklist — tick a task instead." };
  }

  const newCurrent = Math.max(0, Number(proj.current_value) + amount);
  const completed = newCurrent >= Number(proj.target_value);

  const { error: updErr } = await supabase
    .from("projects")
    .update({ current_value: newCurrent, status: completed ? "completed" : "ongoing" })
    .eq("id", projectId);
  if (updErr) return { ok: false, error: updErr.message };

  // One log row per project per day — accumulate if that day already has one.
  const { data: existing } = await supabase
    .from("project_logs")
    .select("id,progress_amount")
    .eq("project_id", projectId)
    .eq("log_date", when.date)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("project_logs")
      .update({ progress_amount: Number(existing.progress_amount) + amount })
      .eq("id", existing.id);
  } else {
    await supabase.from("project_logs").insert({ user_id: user.id, project_id: projectId, log_date: when.date, progress_amount: amount });
  }

  revalidateAll();
  return { ok: true, error: null };
}

// ---- Phase F: edit & delete -----------------------------------------------
// The commit timeline shows `project_logs` rows that carry a note (written by
// `addCommit`, always `progress_amount = 0`), so editing/deleting one never
// touches a numeric project's `current_value`. Editing an old update is allowed
// on purpose — no today/yesterday window. RLS scopes every write to its owner.

/** Edit a dated update's text. `project_id` is only used to revalidate. */
export async function updateCommit(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const logId = (formData.get("log_id") as string) || "";
  const projectId = (formData.get("project_id") as string) || "";
  const note = ((formData.get("note") as string) || "").trim().slice(0, 2000);
  if (!logId) return { ok: false, error: "Missing update." };
  if (!note) return { ok: false, error: "An update can't be empty — delete it instead." };

  const { error } = await supabase.from("project_logs").update({ note }).eq("id", logId);
  if (error) return { ok: false, error: error.message };

  if (projectId) revalidateProject(projectId);
  else revalidateAll();
  return { ok: true, error: null };
}

/** Remove a dated update (that day drops out of "days worked" + the heatmap). */
export async function deleteCommit(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const logId = (formData.get("log_id") as string) || "";
  const projectId = (formData.get("project_id") as string) || "";
  if (!logId) return { ok: false, error: "Missing update." };

  const { error } = await supabase.from("project_logs").delete().eq("id", logId);
  if (error) return { ok: false, error: error.message };

  if (projectId) revalidateProject(projectId);
  else revalidateAll();
  return { ok: true, error: null };
}

/** Rename a project and edit its "why / vision" and aimed finish date. */
export async function renameProject(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const projectId = (formData.get("project_id") as string) || "";
  const name = ((formData.get("name") as string) || "").trim();
  if (!projectId) return { ok: false, error: "Missing project." };
  if (!name) return { ok: false, error: "Give your project a name." };

  const goals = ((formData.get("goals") as string) || "").trim().slice(0, 2000) || null;
  const targetDateRaw = ((formData.get("target_date") as string) || "").trim();
  // A blank clears the date; anything present must be a real yyyy-mm-dd.
  const targetDate = targetDateRaw === "" ? null : /^\d{4}-\d{2}-\d{2}$/.test(targetDateRaw) ? targetDateRaw : undefined;
  if (targetDate === undefined) return { ok: false, error: "That finish date isn't valid." };

  const { error } = await supabase
    .from("projects")
    .update({ name: name.slice(0, 120), goals, target_date: targetDate })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };

  revalidateProject(projectId);
  return { ok: true, error: null };
}

/**
 * Delete a project and everything under it. `project_logs` and `project_tasks`
 * cascade at the DB level (0001/0002 FKs), so one delete is enough. On success
 * this redirects to /projects — the detail route it was deleted from is gone.
 */
export async function deleteProject(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const projectId = (formData.get("project_id") as string) || "";
  if (!projectId) return { ok: false, error: "Missing project." };

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/projects");
}

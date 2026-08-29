"use server";

/*
  AI Project Planner — server actions (Phase H).

  Four actions, mirroring the quick-add/ai-actions.ts pattern:
    generateMilestones  read the project's idea → Groq → milestone suggestions
    applyMilestones     reviewed suggestions → insert as project_tasks
    scanUpdateForMilestones  daily update text → Groq → which milestones are done
    completeMilestones  confirmed ids → toggle tasks done

  Nothing writes directly — applyMilestones fans out through project_tasks
  inserts and recomputeProgress, completeMilestones through toggleTask-like
  updates. Context is always read server-side under RLS.
*/

import { GROQ_MODEL, getGroq, isGroqConfigured } from "@/lib/ai/groq";
import {
  MILESTONE_SYSTEM_PROMPT,
  MATCH_SYSTEM_PROMPT,
  buildMilestonePrompt,
  buildMatchPrompt,
  demoMilestones,
  demoMatch,
  filterMatchIds,
  matchResultSchema,
  milestonesResultSchema,
  type MilestoneSuggestion,
  type OpenMilestone,
} from "@/lib/ai/project-plan";
import { groqDailyBudget, parseLogLimit } from "@/lib/redis";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { recomputeProgress, type LogResult } from "./actions";
import { revalidatePath } from "next/cache";
import { currentDay } from "@/lib/session";

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ---- generateMilestones ----------------------------------------------------

export type GenerateResponse = {
  ok: boolean;
  milestones: MilestoneSuggestion[];
  demo: boolean;
  error: string | null;
};

export async function generateMilestones(projectId: string): Promise<GenerateResponse> {
  if (!isSupabaseConfigured) {
    return { ok: true, milestones: demoMilestones("A demo project idea").milestones, demo: true, error: null };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, milestones: [], demo: false, error: "Please sign in first." };

  const { data: project } = await supabase
    .from("projects")
    .select("name,goals")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { ok: false, milestones: [], demo: false, error: "Project not found." };

  const idea = (project.goals ?? "").trim();
  if (!idea) return { ok: false, milestones: [], demo: false, error: "Add an idea first — describe what you're building." };

  if (!isGroqConfigured()) {
    return { ok: true, milestones: demoMilestones(idea).milestones, demo: true, error: null };
  }

  const gate = await parseLogLimit(user.id);
  if (!gate.allowed) {
    return { ok: false, milestones: [], demo: false, error: "Too many requests — give it a minute." };
  }
  const budget = await groqDailyBudget(1);
  if (!budget.ok) {
    return { ok: false, milestones: [], demo: false, error: "Rabbit's AI has hit today's shared limit — try again tomorrow." };
  }

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MILESTONE_SYSTEM_PROMPT },
        { role: "user", content: buildMilestonePrompt(idea, { projectName: String(project.name) }) },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const json = JSON.parse(raw);
    const parsed = milestonesResultSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, milestones: [], demo: false, error: "Couldn't parse the milestones — try again." };
    }
    return { ok: true, milestones: parsed.data.milestones, demo: false, error: null };
  } catch {
    return { ok: false, milestones: [], demo: false, error: "Couldn't reach the AI — try again." };
  }
}

// ---- applyMilestones -------------------------------------------------------

export async function applyMilestones(
  projectId: string,
  milestones: { title: string; detail: string }[],
): Promise<LogResult> {
  if (!isSupabaseConfigured) return { ok: true, error: null };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const clean = milestones
    .map((m) => ({ title: m.title.trim().slice(0, 200), detail: m.detail.trim().slice(0, 500) }))
    .filter((m) => m.title)
    .slice(0, 12);
  if (!clean.length) return { ok: false, error: "No milestones to add." };

  const { count } = await supabase
    .from("project_tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const rows = clean.map((m, i) => ({
    user_id: user.id,
    project_id: projectId,
    title: m.title,
    detail: m.detail || null,
    source: "ai",
    position: (count ?? 0) + i,
  }));

  const { error } = await supabase.from("project_tasks").insert(rows);
  if (error) return { ok: false, error: error.message };

  await recomputeProgress(supabase, projectId);
  revalidateProject(projectId);
  return { ok: true, error: null };
}

// ---- scanUpdateForMilestones -----------------------------------------------

export type ScanResponse = {
  ok: boolean;
  matches: { id: string; title: string; evidence: string }[];
  demo: boolean;
  error: string | null;
};

export async function scanUpdateForMilestones(
  projectId: string,
  updateText: string,
): Promise<ScanResponse> {
  const text = (updateText ?? "").trim().slice(0, 2000);
  if (!text) return { ok: false, matches: [], demo: false, error: "Write what you got done first." };

  if (!isSupabaseConfigured) {
    return { ok: true, matches: [], demo: true, error: null };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, matches: [], demo: false, error: "Please sign in first." };

  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("id,title,detail")
    .eq("project_id", projectId)
    .eq("done", false)
    .order("position");

  const openMilestones: OpenMilestone[] = (tasks ?? []).map((t) => ({
    id: String(t.id),
    title: String(t.title),
    detail: t.detail ? String(t.detail) : undefined,
  }));

  if (!openMilestones.length) {
    return { ok: true, matches: [], demo: false, error: null };
  }

  if (!isGroqConfigured()) {
    const result = demoMatch(text, openMilestones);
    const matches = result.completed.map((m) => {
      const task = openMilestones.find((t) => t.id === m.id);
      return { id: m.id, title: task?.title ?? "", evidence: m.evidence };
    });
    return { ok: true, matches, demo: true, error: null };
  }

  const gate = await parseLogLimit(user.id);
  if (!gate.allowed) {
    return { ok: false, matches: [], demo: false, error: "Too many requests — give it a minute." };
  }
  const budgetCheck = await groqDailyBudget(1);
  if (!budgetCheck.ok) {
    return { ok: false, matches: [], demo: false, error: "Rabbit's AI has hit today's shared limit — try again tomorrow." };
  }

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MATCH_SYSTEM_PROMPT },
        { role: "user", content: buildMatchPrompt(text, openMilestones) },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const json = JSON.parse(raw);
    const parsed = matchResultSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, matches: [], demo: false, error: "Couldn't parse the response — try again." };
    }

    const validIds = new Set(openMilestones.map((m) => m.id));
    const filtered = filterMatchIds(parsed.data, validIds);
    const matches = filtered.completed.map((m) => {
      const task = openMilestones.find((t) => t.id === m.id);
      return { id: m.id, title: task?.title ?? "", evidence: m.evidence };
    });
    return { ok: true, matches, demo: false, error: null };
  } catch {
    return { ok: false, matches: [], demo: false, error: "Couldn't reach the AI — try again." };
  }
}

// ---- completeMilestones ----------------------------------------------------

export async function completeMilestones(
  projectId: string,
  taskIds: string[],
): Promise<LogResult> {
  if (!isSupabaseConfigured) return { ok: true, error: null };
  if (!taskIds.length) return { ok: false, error: "No milestones selected." };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("id,done")
    .eq("project_id", projectId)
    .in("id", taskIds);

  const openIds = (tasks ?? []).filter((t) => !t.done).map((t) => String(t.id));
  if (!openIds.length) return { ok: true, error: null };

  const today = await currentDay();
  const { error } = await supabase
    .from("project_tasks")
    .update({ done: true, done_at: today })
    .in("id", openIds);
  if (error) return { ok: false, error: error.message };

  await recomputeProgress(supabase, projectId);
  revalidateProject(projectId);
  return { ok: true, error: null };
}

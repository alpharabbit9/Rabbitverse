"use server";

/*
  Create New Project — server actions.

  Two of them, and they are deliberately the only two:

    generateProjectBlueprint(input)  description → Groq → { idea, features, problems, milestones }
    createProjectFromBlueprint(payload)  the reviewed draft → one project + its milestones

  Everything between those two calls — editing the idea, adding a feature,
  deleting a problem, reordering milestones, changing a status — is local draft
  state in the browser. Nothing is written until the user presses Create Project,
  so abandoning the page leaves no half-built project behind, and the page needs
  no cleanup path.

  The AI call sits behind the same three guardrails as every other Groq entry
  point (per-user rate limit, shared daily circuit breaker, offline fallback),
  and every write goes through the anon-key client so RLS scopes it to its owner.
*/

import { revalidatePath } from "next/cache";
import { GROQ_MODEL, getGroq, isGroqConfigured } from "@/lib/ai/groq";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  DESCRIPTION_MAX,
  blueprintSchema,
  buildBlueprintPrompt,
  demoBlueprint,
  validateCreatePayload,
  type Blueprint,
  type CreateProjectPayload,
} from "@/lib/ai/project-blueprint";
import { sanitiseTags } from "@/lib/project-tags";
import { groqDailyBudget, plannerLimit } from "@/lib/redis";
import { currentDay } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ---- generateProjectBlueprint ----------------------------------------------

export type BlueprintResponse = {
  ok: boolean;
  blueprint: Blueprint | null;
  /** True when the result came from the offline heuristic, not the model. */
  offline: boolean;
  error: string | null;
};

export interface GenerateBlueprintInput {
  description: string;
  /** What the user has typed in the name field, if anything. */
  projectName?: string;
}

/**
 * Turn one free-form description into a structured blueprint.
 *
 * Falls back to `demoBlueprint` — never to an error — whenever the model is
 * simply not available (demo mode, no `GROQ_API_KEY`). A genuine failure of a
 * configured model does surface as an error, because that one is worth a retry.
 */
export async function generateProjectBlueprint(input: GenerateBlueprintInput): Promise<BlueprintResponse> {
  const description = (input.description ?? "").trim().slice(0, DESCRIPTION_MAX);
  const projectName = (input.projectName ?? "").trim().slice(0, 120);

  if (!description) {
    return { ok: false, blueprint: null, offline: false, error: "Describe your project first." };
  }
  if (description.length < 40) {
    return {
      ok: false,
      blueprint: null,
      offline: false,
      error: "Add a bit more detail — a sentence or two about what you are building.",
    };
  }

  const offline = (): BlueprintResponse => ({
    ok: true,
    blueprint: demoBlueprint(description, projectName),
    offline: true,
    error: null,
  });

  if (!isSupabaseConfigured || !isGroqConfigured()) return offline();

  const { user } = await requireUser();
  if (!user) return { ok: false, blueprint: null, offline: false, error: "Please sign in first." };

  const gate = await plannerLimit(user.id);
  if (!gate.allowed) {
    return { ok: false, blueprint: null, offline: false, error: "Too many requests — give it a minute." };
  }
  const budget = await groqDailyBudget(1);
  if (!budget.ok) {
    return {
      ok: false,
      blueprint: null,
      offline: false,
      error: "Rabbit's AI has hit today's shared limit — try again tomorrow.",
    };
  }

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
        { role: "user", content: buildBlueprintPrompt(description, { projectName }) },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = blueprintSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return { ok: false, blueprint: null, offline: false, error: "Couldn't read the blueprint — try again." };
    }
    // The model is allowed to propose a name, never to overrule one the user typed.
    const blueprint = projectName ? { ...parsed.data, name: projectName } : parsed.data;
    return { ok: true, blueprint, offline: false, error: null };
  } catch {
    return { ok: false, blueprint: null, offline: false, error: "Couldn't reach the AI — try again." };
  }
}

// ---- createProjectFromBlueprint --------------------------------------------

export type CreateProjectResult = {
  ok: boolean;
  projectId: string | null;
  error: string | null;
};

/**
 * Write the reviewed draft: one `projects` row carrying the blueprint, then its
 * milestones as `project_tasks` in the order the user left them.
 *
 * Status follows the milestones rather than a picker — a project whose first
 * milestone is already in progress is, by definition, in progress. That keeps
 * this consistent with `recomputeProgress`, which is what every later write
 * uses.
 *
 * A milestone insert that fails takes the project row with it: a project whose
 * blueprint promises seven milestones and has none is worse than no project, and
 * the user still has the whole draft on screen to retry from.
 */
export async function createProjectFromBlueprint(payload: CreateProjectPayload): Promise<CreateProjectResult> {
  const invalid = validateCreatePayload(payload);
  if (invalid) return { ok: false, projectId: null, error: invalid };

  if (!isSupabaseConfigured) {
    return { ok: false, projectId: null, error: "Demo mode — connect Supabase to save projects." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, projectId: null, error: "Please sign in first." };

  const name = payload.name.trim().slice(0, 120);
  const description = payload.description.trim().slice(0, DESCRIPTION_MAX);
  const idea = payload.idea.trim().slice(0, 1000);
  const category = (payload.category ?? "").trim().slice(0, 60) || null;
  const type = (payload.type ?? "").trim().slice(0, 60) || null;
  const keyFeatures = payload.keyFeatures.map((f) => f.trim().slice(0, 200)).filter(Boolean).slice(0, 12);
  const problems = payload.problems.map((p) => p.trim().slice(0, 200)).filter(Boolean).slice(0, 12);
  const milestones = payload.milestones
    .map((m) => ({
      title: m.title.trim().slice(0, 200),
      detail: m.description.trim().slice(0, 500) || null,
      status: m.status,
    }))
    .filter((m) => m.title)
    .slice(0, 12);

  if (!milestones.length) return { ok: false, projectId: null, error: "Add at least one milestone." };

  // The logo URL is only ever one we minted ourselves in the project-logos
  // bucket. Anything else — an off-site URL, a `javascript:` string smuggled
  // through a hand-rolled request — is dropped rather than rendered later.
  const logoUrl = sanitiseLogoUrl(payload.logoUrl);

  // A blank finish date is fine (many projects have none); anything present must
  // be a real yyyy-mm-dd or it is dropped — same rule the edit form enforces.
  const targetDateRaw = (payload.targetDate ?? "").trim();
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(targetDateRaw) ? targetDateRaw : null;

  const tags = sanitiseTags(payload.tags);

  const done = milestones.filter((m) => m.status === "completed").length;
  const started = milestones.some((m) => m.status !== "planned");
  const status = done === milestones.length ? "completed" : started ? "ongoing" : "planned";

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      // The card subtitle is the idea, trimmed — the raw brief lives in `goals`.
      description: idea.slice(0, 300),
      goals: description,
      idea,
      key_features: keyFeatures,
      problems,
      logo_url: logoUrl,
      category,
      type,
      tags,
      target_value: 100,
      target_unit: "%",
      current_value: Math.round((done / milestones.length) * 100),
      status,
      start_date: await currentDay(),
      target_date: targetDate,
    })
    .select("id")
    .single();

  if (error || !project) {
    return { ok: false, projectId: null, error: error?.message ?? "Couldn't create the project." };
  }

  const projectId = String(project.id);
  const today = await currentDay();

  const { error: taskError } = await supabase.from("project_tasks").insert(
    milestones.map((m, i) => ({
      user_id: user.id,
      project_id: projectId,
      title: m.title,
      detail: m.detail,
      status: m.status,
      done: m.status === "completed",
      done_at: m.status === "completed" ? today : null,
      source: "ai",
      position: i,
    })),
  );

  if (taskError) {
    await supabase.from("projects").delete().eq("id", projectId);
    return { ok: false, projectId: null, error: taskError.message };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return { ok: true, projectId, error: null };
}

/** Accept only an https URL inside our own project-logos bucket. */
function sanitiseLogoUrl(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (!url.pathname.includes("/project-logos/")) return null;
    return url.toString().slice(0, 1000);
  } catch {
    return null;
  }
}

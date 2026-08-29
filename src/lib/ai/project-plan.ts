/*
  Pure AI layer for Project Planner (Phase H).

  Two contracts, mirroring parse-log.ts:
    A. Milestone generation — idea text → 4–8 concrete checkpoints.
    B. Milestone matching  — daily update text + open milestones → which ones
       the update says are finished.

  No I/O, deterministic, unit-testable. The server actions live in
  `projects/ai-actions.ts`; the review UI is in `project-detail-view.tsx`.
*/
import { z } from "zod";

// ---- A. Milestone generation ------------------------------------------------

export const MILESTONE_SYSTEM_PROMPT = `You are a project planner for Rabbit Verse, a personal life-tracking app.
The user describes a project idea. Break it into 4–8 concrete, independently-completable milestones (checkpoints).

Output JSON: { "milestones": [{ "title": string, "detail": string }] }

Rules:
- Titles are short & imperative, ≤80 characters (e.g. "Set up the database schema").
- "detail" is one sentence clarifying what "done" looks like.
- Order does not imply dependency — every milestone must be completable on its own.
- If the idea is too vague for concrete milestones, return 3–4 generic phases.
- Output JSON only. No prose.`;

export function buildMilestonePrompt(idea: string, opts: { projectName: string }): string {
  return [
    `Project: "${opts.projectName}"`,
    ``,
    `Idea / brief:`,
    idea.trim(),
  ].join("\n");
}

export const milestoneSchema = z.object({
  title: z.string().min(1).max(200),
  detail: z.string().max(500).default(""),
});

export const milestonesResultSchema = z.object({
  milestones: z.array(milestoneSchema).min(1).max(12),
});

export type MilestoneResult = z.infer<typeof milestonesResultSchema>;
export type MilestoneSuggestion = z.infer<typeof milestoneSchema>;

/**
 * Offline fallback: split the idea into sentence/bullet segments as milestones.
 * Keeps the flow previewable without a Groq key.
 */
export function demoMilestones(idea: string): MilestoneResult {
  const lines = idea
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  if (lines.length === 0) {
    return {
      milestones: [
        { title: "Define the scope and goals", detail: "Write down what done looks like." },
        { title: "Build the core feature", detail: "Get the main thing working end to end." },
        { title: "Test and refine", detail: "Fix bugs and polish the experience." },
        { title: "Ship it", detail: "Deploy and share with users." },
      ],
    };
  }

  const milestones = lines.slice(0, 8).map((line) => {
    const title = line.length > 80 ? line.slice(0, 77) + "..." : line;
    return { title, detail: "" };
  });

  return { milestones };
}

// ---- B. Milestone matching --------------------------------------------------

export const MATCH_SYSTEM_PROMPT = `You are a progress tracker for Rabbit Verse, a personal life-tracking app.
Given the user's daily update and a numbered list of the project's open milestones, determine which milestones the update says are FINISHED (not merely started or in progress).

Output JSON: { "completed": [{ "id": string, "evidence": string }] }

Rules:
- "id" must be one of the ids from the numbered list below.
- "evidence" is a brief quote or phrase from the update that proves the milestone is done.
- Include a milestone ONLY when the update clearly states it is finished/done/shipped/completed.
- If nothing is clearly done, return { "completed": [] }.
- Output JSON only. No prose.`;

export interface OpenMilestone {
  id: string;
  title: string;
  detail?: string;
}

export function buildMatchPrompt(updateText: string, openMilestones: OpenMilestone[]): string {
  const list = openMilestones
    .map((m, i) => `${i + 1}. [id="${m.id}"] ${m.title}${m.detail ? ` — ${m.detail}` : ""}`)
    .join("\n");
  return [
    `Open milestones:`,
    list,
    ``,
    `Today's update:`,
    `"${updateText.trim()}"`,
  ].join("\n");
}

export const matchItemSchema = z.object({
  id: z.string(),
  evidence: z.string().max(300).default(""),
});

export const matchResultSchema = z.object({
  completed: z.array(matchItemSchema),
});

export type MatchResult = z.infer<typeof matchResultSchema>;

/**
 * Filter model-returned ids to the exact set we gave it — the model can never
 * complete a task outside the project. Defence-in-depth.
 */
export function filterMatchIds(
  result: MatchResult,
  validIds: Set<string>,
): MatchResult {
  return {
    completed: result.completed.filter((m) => validIds.has(m.id)),
  };
}

/**
 * Offline fallback: simple token-overlap heuristic. Splits both the update
 * and each milestone into words, counts how many overlap, and treats anything
 * above a threshold as a match.
 */
export function demoMatch(updateText: string, openMilestones: OpenMilestone[]): MatchResult {
  const THRESHOLD = 0.35;

  const updateTokens = new Set(
    updateText
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2),
  );
  if (updateTokens.size === 0) return { completed: [] };

  const completed: MatchResult["completed"] = [];
  for (const m of openMilestones) {
    const milestoneWords = `${m.title} ${m.detail ?? ""}`
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2);
    if (milestoneWords.length === 0) continue;
    const overlap = milestoneWords.filter((w) => updateTokens.has(w)).length;
    if (overlap / milestoneWords.length >= THRESHOLD) {
      completed.push({ id: m.id, evidence: "Token overlap match (demo)" });
    }
  }
  return { completed };
}

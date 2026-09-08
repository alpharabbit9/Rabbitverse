/*
  Pure AI layer for the Create New Project blueprint.

  One free-form description in, one structured blueprint out:

      { name, idea, keyFeatures[], problems[], milestones[{title,description,status}] }

  This is the whole contract. `project-plan.ts` next door does something
  narrower — it turns an existing project's saved brief into milestones only —
  and is still what the project detail page uses. This module is what the
  creation page uses, because at creation time there is no project yet: the idea
  card, the feature list, the problem list and the milestones all have to come
  out of the same read of the same paragraph, or they end up describing subtly
  different products.

  No I/O, deterministic, unit-testable. The server actions live in
  `projects/blueprint-actions.ts`.
*/
import { z } from "zod";

/** Hard ceiling on the description, mirrored by the textarea's counter. */
export const DESCRIPTION_MAX = 5000;

export const MILESTONE_STATUSES = ["planned", "in_progress", "completed"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
};

// ---- The prompt -------------------------------------------------------------

export const BLUEPRINT_SYSTEM_PROMPT = `You are an expert product manager and software architect.

Analyse the user's project description and transform it into a structured project blueprint.

Extract:
- A short project name (2-4 words) if the description implies one.
- The core project idea, as ONE paragraph of at most 3 sentences.
- The key features.
- The problems the project solves.

Then break the project into logical implementation milestones.

Output JSON only, matching exactly this schema:
{
  "name": string,
  "idea": string,
  "keyFeatures": [string],
  "problems": [string],
  "milestones": [{ "title": string, "description": string, "status": "planned" }]
}

Rules:
- Use ONLY what the description states or clearly implies. Never invent unrelated functionality, technologies or audiences.
- 3-8 key features. Each is a short noun phrase (at most 70 characters), not a sentence. No trailing punctuation.
- 3-6 problems. Each is one short sentence naming a real pain the description points at.
- 4-8 milestones, ordered by dependency: what must exist first comes first.
- A milestone "title" is 2-5 words naming a concrete deliverable ("Core Dashboard", "Finance & Expense Tracking"), never a generic phase label like "Phase 2" or "Development".
- A milestone "description" is one sentence describing the work in that milestone, drawn from the features and modules the user actually mentioned.
- Milestones must be specific to THIS project. Only the first ("Project Setup & Planning") and last ("Testing & Launch") may be generic.
- Every milestone "status" is "planned".
- If the description is too thin to be specific, return fewer items rather than padding with invented ones.
- Output JSON only. No prose, no markdown fences.`;

export function buildBlueprintPrompt(description: string, opts?: { projectName?: string }): string {
  const name = opts?.projectName?.trim();
  return [
    name ? `Working project name: "${name}"` : `The project has not been named yet — propose one.`,
    ``,
    `Project description:`,
    description.trim().slice(0, DESCRIPTION_MAX),
  ].join("\n");
}

// ---- The schema -------------------------------------------------------------

/** Collapse whitespace and strip the bullet glyphs models like to prefix. */
export function tidy(line: string): string {
  return line
    .replace(/\s+/g, " ")
    .replace(/^[\s*\-•·✓✔◆▪]+/, "")
    .trim();
}

const bullet = z.string().transform(tidy).pipe(z.string().min(1).max(200));

export const blueprintMilestoneSchema = z.object({
  title: z.string().transform(tidy).pipe(z.string().min(1).max(200)),
  description: z.string().transform(tidy).pipe(z.string().max(500)).catch(""),
  status: z.enum(MILESTONE_STATUSES).catch("planned"),
});

export const blueprintSchema = z.object({
  name: z.string().transform(tidy).pipe(z.string().max(120)).catch(""),
  idea: z.string().transform(tidy).pipe(z.string().min(1).max(1000)),
  keyFeatures: z.array(bullet).min(1).max(12),
  problems: z.array(bullet).min(1).max(12),
  milestones: z.array(blueprintMilestoneSchema).min(1).max(12),
});

export type Blueprint = z.infer<typeof blueprintSchema>;
export type BlueprintMilestone = z.infer<typeof blueprintMilestoneSchema>;

/**
 * A milestone as the UI carries it: the model's shape plus a client-side id, so
 * React keys and drag-reorder survive edits to the title.
 */
export interface DraftMilestone extends BlueprintMilestone {
  id: string;
}

export interface DraftBlueprint {
  name: string;
  idea: string;
  keyFeatures: string[];
  problems: string[];
  milestones: DraftMilestone[];
}

let seq = 0;
/** Ids only ever live in the browser session, so a counter is enough. */
export function draftId(prefix = "m"): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

/**
 * Move one item, clamping the destination. Both the milestone drag-and-drop and
 * its keyboard equivalent go through here, so the two can never disagree about
 * what "move down from the last row" means.
 */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const target = Math.max(0, Math.min(list.length - 1, to));
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

export function toDraft(blueprint: Blueprint): DraftBlueprint {
  return {
    name: blueprint.name,
    idea: blueprint.idea,
    keyFeatures: [...blueprint.keyFeatures],
    problems: [...blueprint.problems],
    milestones: blueprint.milestones.map((m) => ({ ...m, id: draftId() })),
  };
}

// ---- Offline fallback -------------------------------------------------------

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "into", "from", "have", "will", "want",
  "build", "building", "make", "making", "app", "application", "platform", "system",
  "users", "user", "help", "helps", "also", "them", "their", "your", "you", "our",
  "single", "different", "multiple", "one", "all", "can", "are", "its", "place",
  "together", "brings", "bring", "using", "used", "each", "other", "more", "most",
]);

/** Sentence-ish split that survives bullet lists and newlines. */
export function segments(text: string): string[] {
  return text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map(tidy)
    .filter((s) => s.length > 3);
}

/**
 * Fold a plural onto its singular so "habit" and "habits" are one topic rather
 * than two words that each look half as important as they are.
 */
function stem(word: string): string {
  return word.length > 4 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

/** The most distinctive nouns in the description — used to name phases. */
function keywords(text: string, limit: number): string[] {
  // Counted by stem, displayed by the surface form that occurred most often, so
  // the label reads "Analytics" rather than the stemmed "Analytic".
  const counts = new Map<string, number>();
  const surfaces = new Map<string, Map<string, number>>();

  for (const word of text.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []) {
    if (STOPWORDS.has(word)) continue;
    const key = stem(word);
    if (STOPWORDS.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const forms = surfaces.get(key) ?? new Map<string, number>();
    forms.set(word, (forms.get(word) ?? 0) + 1);
    surfaces.set(key, forms);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => {
      const forms = [...(surfaces.get(key) ?? new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const word = String(forms[0]?.[0] ?? key);
      return word[0].toUpperCase() + word.slice(1);
    });
}

function sentenceCase(s: string): string {
  const t = tidy(s);
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

/**
 * Cut to a length without cutting through a word. A plain `.slice()` here reads
 * as a rendering bug — the card looks clipped rather than shortened.
 */
function truncateWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

/**
 * Offline blueprint: a keyword/segment heuristic over the description itself.
 *
 * It exists so the whole page — generate, review, edit, reorder, create — is
 * exercisable in demo mode and with no `GROQ_API_KEY`, and so a Groq outage
 * degrades to something usable instead of a dead button. It is openly a
 * heuristic, and the UI says so when it shows its output.
 */
export function demoBlueprint(description: string, projectName = ""): Blueprint {
  const text = description.trim();
  const parts = segments(text);
  const topics = keywords(text, 6);

  const idea =
    truncateWords(parts.slice(0, 2).join(" "), 400) ||
    "A new project — describe it in more detail to get a sharper blueprint.";

  const keyFeatures = (topics.length ? topics : ["Core experience"])
    .slice(0, 6)
    .map((t) => `${t} module`);

  const problems = parts
    .filter((s) => /problem|instead|replace|hard|difficult|lack|no |without|struggl|frustrat/i.test(s))
    .slice(0, 5)
    .map((s) => truncateWords(sentenceCase(s), 180));

  const middle = (topics.length ? topics : ["Core Experience"]).slice(0, 5).map((topic) => ({
    title: `${topic} Module`,
    description: `Design, build and verify the ${topic.toLowerCase()} part of the project.`,
    status: "planned" as const,
  }));

  return {
    name: projectName || topics.slice(0, 2).join(" ") || "",
    idea: sentenceCase(idea),
    keyFeatures,
    problems: problems.length
      ? problems
      : ["The work is spread across tools that do not talk to each other."],
    milestones: [
      {
        title: "Project Setup & Planning",
        description: "Define the scope, choose the tech stack, sketch the screens and set up the repository.",
        status: "planned" as const,
      },
      ...middle,
      {
        title: "Testing & Launch",
        description: "Test the flows end to end, fix what breaks, polish performance and ship it.",
        status: "planned" as const,
      },
    ].slice(0, 8),
  };
}

// ---- Validation shared by the client and the create action ------------------

export interface CreateProjectPayload {
  name: string;
  logoUrl: string | null;
  description: string;
  idea: string;
  keyFeatures: string[];
  problems: string[];
  milestones: { title: string; description: string; status: MilestoneStatus }[];
  /** Aimed finish date as `yyyy-mm-dd`, or null/empty for none. */
  targetDate: string | null;
  /** Free/preset labels; the create action caps count and per-tag length. */
  tags: string[];
  /** Free label shown in the detail header, e.g. "Personal Growth". Optional. */
  category: string | null;
  /** Free label shown in the detail header, e.g. "Full-stack Web App". Optional. */
  type: string | null;
}

/**
 * The one place that decides whether a draft is complete enough to become a
 * project. The button calls it to know whether to enable itself; the server
 * action calls it again on the payload it actually received, because a disabled
 * button is a courtesy and not a check.
 */
export function validateCreatePayload(payload: Partial<CreateProjectPayload>): string | null {
  if (!payload.name?.trim()) return "Give your project a name.";
  if (!payload.description?.trim()) return "Describe your project first.";
  if (!payload.idea?.trim()) return "Generate the blueprint before creating the project.";
  if (!payload.keyFeatures?.length && !payload.problems?.length) {
    return "The blueprint needs at least one feature or problem.";
  }
  if (!payload.milestones?.length) return "Add at least one milestone.";
  return null;
}

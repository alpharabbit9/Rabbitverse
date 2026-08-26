/*
  Pure parse layer for AI natural-language logging (Pillar 1).

  This module owns the *contract* between the model and the app, with no I/O:
    1. `LogIntent` — the typed shapes the model may emit (validated by `logIntentSchema`).
    2. The prompt (`SYSTEM_PROMPT` + `buildUserPrompt`) the Groq call sends.
    3. `intentToDispatch` — maps a validated intent → the exact Server-Action args
       (FormData field names) that V1's existing actions already expect.

  Everything here is deterministic and unit-testable (no network, no Supabase).
  The network call lives in `quick-add/ai-actions.ts` (Phase 2); the review/save
  UI in `components/quick-add/ai-log-box.tsx` (Phase 3).
*/
import { z } from "zod";
import { currencySymbol, money, normalizeCurrency } from "@/lib/money";

// ---- The intent contract (model output) ----------------------------------

const moodSchema = z.number().int().min(1).max(5);

export const logIntentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("expense"),
    amount: z.number().positive(),
    categoryHint: z.string().default(""),
    note: z.string().optional(),
    date: z.string(), // "yyyy-mm-dd" — the model resolves today/yesterday to a date
  }),
  z.object({
    kind: z.literal("workout"),
    done: z.boolean(),
    planLabel: z.string().default(""),
    note: z.string().optional(),
    /** Optional so an older/terser model reply still validates; defaults to today. */
    date: z.string().optional(),
  }),
  z.object({
    kind: z.literal("weight"),
    weightKg: z.number().positive().optional(),
    bodyFatPct: z.number().positive().optional(),
    /** Optional so an older/terser model reply still validates; defaults to today. */
    date: z.string().optional(),
  }),
  z.object({
    kind: z.literal("journal"),
    mood: moodSchema.optional(),
    body: z.string().optional(),
    date: z.string(),
  }),
  z.object({
    kind: z.literal("project"),
    projectHint: z.string(),
    amount: z.number(),
    /** Optional so an older/terser model reply still validates; defaults to today. */
    date: z.string().optional(),
  }),
]);

/** The whole model response we validate against. */
export const parseResultSchema = z.object({
  intents: z.array(logIntentSchema),
});

export type LogIntent = z.infer<typeof logIntentSchema>;
export type ParseResult = z.infer<typeof parseResultSchema>;

// ---- Context ---------------------------------------------------------------

export interface NamedRef {
  id: string;
  name: string;
}

/** Everything the parser + mapper need to resolve hints and dates. */
export interface LogContext {
  categories: NamedRef[];
  projects: NamedRef[];
  /** "yyyy-mm-dd" in the *user's* timezone, not the server's. */
  today: string;
  yesterday: string;
  /** The user's ISO-4217 code — decides how amounts are read and summarised. */
  currency?: string;
  /** The user's BCP-47 tag, for formatting the summaries. */
  locale?: string;
  /** The user's IANA timezone, so the model resolves "tonight" on their clock. */
  tz?: string;
}

// ---- Dispatch descriptor (what the review UI + save step consume) ---------

/** The V1 Server Actions an intent can map onto. */
export type ActionName = "addExpense" | "setWorkout" | "logWeight" | "saveJournal" | "logProgress";

export interface Dispatch {
  /** Which intent produced this — the review UI renders a different editor per kind. */
  kind: LogIntent["kind"];
  action: ActionName;
  /** Field name → value, matching the FormData the target action reads. */
  fields: Record<string, string>;
  /** Short human summary for the review chip. */
  summary: string;
  /** Field keys the user must still supply before saving (e.g. unresolved category). */
  unresolved: string[];
}

// ---- Prompt ----------------------------------------------------------------

export const SYSTEM_PROMPT = `You are the logging parser for Rabbit Verse, a personal life-tracking app.
Convert the user's short sentence about their day into a JSON object: { "intents": [ ... ] }.
Each intent is one thing to log. Emit ONLY these kinds:

- expense:  { "kind":"expense", "amount": number, "categoryHint": string, "note"?: string, "date": "yyyy-mm-dd" }
- workout:  { "kind":"workout", "done": boolean, "planLabel": string, "note"?: string, "date": "yyyy-mm-dd" }
- weight:   { "kind":"weight", "weightKg"?: number, "bodyFatPct"?: number, "date": "yyyy-mm-dd" }
- journal:  { "kind":"journal", "mood"?: 1|2|3|4|5, "body"?: string, "date": "yyyy-mm-dd" }
- project:  { "kind":"project", "projectHint": string, "amount": number, "date": "yyyy-mm-dd" }

Rules:
- Money amounts are in the user's own currency, named in the context message below. Emit "amount" as a bare number, never with a symbol. "categoryHint" should be one of the user's categories when it clearly matches, else your best short label.
- "planLabel" is the workout type (e.g. Push, Pull, Legs, Cardio). A rest day is { "done": false }.
- mood: map feelings to 1 (rough) … 5 (great). Only include mood if the user expressed one.
- "projectHint" should match one of the user's active projects when clear.
- Every "date" field: resolve "today"/"this morning"/"tonight" to today's date and "yesterday" to yesterday's date. Never use any other date. A day mentioned once ("yesterday: ...") applies to every intent in the sentence.
- Only include an intent when the sentence actually mentions it. Return { "intents": [] } if nothing is loggable.
- Output JSON only. No prose.`;

/** The per-request user message: the sentence plus resolved context. */
export function buildUserPrompt(sentence: string, ctx: LogContext): string {
  const cats = ctx.categories.map((c) => c.name).join(", ") || "(none yet)";
  const projs = ctx.projects.map((p) => p.name).join(", ") || "(none yet)";
  const currency = normalizeCurrency(ctx.currency);
  return [
    `Today is ${ctx.today}. Yesterday was ${ctx.yesterday}${ctx.tz ? ` (timezone ${ctx.tz})` : ""}.`,
    `Money is in ${currency} (symbol "${currencySymbol(currency, ctx.locale)}").`,
    `Expense categories: ${cats}.`,
    `Active projects: ${projs}.`,
    ``,
    `Sentence: "${sentence.trim()}"`,
  ].join("\n");
}

// ---- Mapping: intent → Server-Action args (pure) --------------------------

/** Case-insensitive name resolution: exact match first, then substring either way. */
export function resolveRef(hint: string, refs: NamedRef[]): NamedRef | null {
  const h = hint.trim().toLowerCase();
  if (!h) return null;
  const exact = refs.find((r) => r.name.trim().toLowerCase() === h);
  if (exact) return exact;
  return refs.find((r) => {
    const n = r.name.trim().toLowerCase();
    return n.includes(h) || h.includes(n);
  }) ?? null;
}

/** Clamp a model-supplied date to the editable window (today/yesterday), else today. */
function clampDate(date: string, ctx: LogContext): string {
  return date === ctx.today || date === ctx.yesterday ? date : ctx.today;
}

/**
 * Map one validated intent to a dispatch descriptor. Pure: given the same intent
 * and context it always returns the same result. Unresolved references (unknown
 * category/project, missing required mood/weight) are surfaced via `unresolved`
 * so the review UI can prompt for them instead of silently guessing.
 */
export function intentToDispatch(intent: LogIntent, ctx: LogContext): Dispatch {
  switch (intent.kind) {
    case "expense": {
      const cat = resolveRef(intent.categoryHint, ctx.categories);
      const fields: Record<string, string> = {
        amount: String(intent.amount),
        category_id: cat?.id ?? "",
        spent_at: clampDate(intent.date, ctx),
      };
      if (intent.note) fields.note = intent.note;
      const label = cat?.name ?? (intent.categoryHint || "Uncategorized");
      return {
        kind: "expense",
        action: "addExpense",
        fields,
        summary: `${money(intent.amount, { currency: ctx.currency, locale: ctx.locale })} · ${label}`,
        unresolved: cat ? [] : ["category_id"],
      };
    }
    case "workout": {
      return {
        kind: "workout",
        action: "setWorkout",
        fields: { done: String(intent.done), plan_label: intent.planLabel, log_date: clampDate(intent.date ?? ctx.today, ctx) },
        summary: intent.done ? `Workout: ${intent.planLabel || "session"} done` : "Rest day",
        unresolved: [],
      };
    }
    case "weight": {
      const fields: Record<string, string> = { log_date: clampDate(intent.date ?? ctx.today, ctx) };
      if (intent.weightKg != null) fields.weight = String(intent.weightKg);
      if (intent.bodyFatPct != null) fields.body_fat = String(intent.bodyFatPct);
      const parts = [
        intent.weightKg != null ? `${intent.weightKg} kg` : null,
        intent.bodyFatPct != null ? `${intent.bodyFatPct}% fat` : null,
      ].filter(Boolean);
      return {
        kind: "weight",
        action: "logWeight",
        fields,
        summary: `Body: ${parts.join(" · ") || "—"}`,
        unresolved: intent.weightKg != null ? [] : ["weight"],
      };
    }
    case "journal": {
      const fields: Record<string, string> = { entry_date: clampDate(intent.date, ctx) };
      if (intent.mood != null) fields.mood = String(intent.mood);
      if (intent.body) fields.body = intent.body;
      return {
        kind: "journal",
        action: "saveJournal",
        fields,
        summary: intent.mood != null ? `Mood ${intent.mood}/5` : "Journal entry",
        unresolved: intent.mood != null ? [] : ["mood"],
      };
    }
    case "project": {
      const proj = resolveRef(intent.projectHint, ctx.projects);
      return {
        kind: "project",
        action: "logProgress",
        fields: {
          project_id: proj?.id ?? "",
          amount: String(intent.amount),
          log_date: clampDate(intent.date ?? ctx.today, ctx),
        },
        summary: `${proj?.name ?? intent.projectHint} +${intent.amount}`,
        unresolved: proj ? [] : ["project_id"],
      };
    }
  }
}

/** Map a whole validated parse result to dispatch descriptors, in order. */
export function resultToDispatches(result: ParseResult, ctx: LogContext): Dispatch[] {
  return result.intents.map((i) => intentToDispatch(i, ctx));
}

// ---- Round-trip validation (client edits → server save) -------------------

/**
 * The exact FormData keys each action is allowed to receive. The review UI
 * sends dispatches back to `saveIntents`, so the server rebuilds FormData from
 * this whitelist only — a tampered payload can't smuggle extra fields into a
 * write path. (`user_id` and every ownership check stay server-side + RLS.)
 */
export const ALLOWED_FIELDS: Record<ActionName, readonly string[]> = {
  addExpense: ["amount", "category_id", "note", "spent_at"],
  setWorkout: ["done", "plan_label", "log_date"],
  logWeight: ["weight", "body_fat", "log_date"],
  saveJournal: ["mood", "body", "entry_date"],
  logProgress: ["project_id", "amount", "log_date"],
};

/** Which fields must be filled before an action can be dispatched at all. */
const REQUIRED_FIELDS: Record<ActionName, readonly string[]> = {
  addExpense: ["amount", "category_id"],
  setWorkout: ["done"],
  logWeight: ["weight"],
  saveJournal: ["mood"],
  logProgress: ["project_id", "amount"],
};

/** A dispatch as it comes back from the client, before we trust any of it. */
export const dispatchSchema = z.object({
  kind: z.enum(["expense", "workout", "weight", "journal", "project"]),
  action: z.enum(["addExpense", "setWorkout", "logWeight", "saveJournal", "logProgress"]),
  fields: z.record(z.string(), z.string()),
  summary: z.string(),
  unresolved: z.array(z.string()),
});

/**
 * Recompute which required fields are still blank. The review UI calls this
 * after every edit to enable/disable Save; the server calls it again before
 * writing, so `unresolved` from the client is never load-bearing.
 */
export function dispatchUnresolved(d: Pick<Dispatch, "action" | "fields">): string[] {
  return REQUIRED_FIELDS[d.action].filter((k) => !(d.fields[k] ?? "").trim());
}

/** Strip a dispatch's fields down to the keys its target action actually reads. */
export function sanitizeFields(action: ActionName, fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ALLOWED_FIELDS[action]) {
    const v = fields[key];
    if (v != null && v !== "") out[key] = v;
  }
  return out;
}

// ---- Demo parse (no API key needed) ---------------------------------------

const WORKOUT_WORDS = /\b(gym|workout|worked out|trained|training|lifted|ran|run|jog|cardio|push|pull|legs|core|full body)\b/i;
const REST_WORDS = /\b(rest day|rested|skipped the gym|no workout)\b/i;
const MOOD_WORDS: [RegExp, 1 | 2 | 3 | 4 | 5][] = [
  [/\b(terrible|awful|rough|miserable|exhausted)\b/i, 1],
  [/\b(down|low|sad|tired|meh)\b/i, 2],
  [/\b(okay|ok|fine|alright|average)\b/i, 3],
  [/\b(good|happy|productive|solid)\b/i, 4],
  [/\b(great|amazing|fantastic|excellent|brilliant)\b/i, 5],
];

/**
 * A deterministic, offline stand-in for the model, used in demo mode (and if
 * `GROQ_API_KEY` is missing) so the whole type → review → save flow can be
 * previewed without keys or network. Deliberately simple: it catches money
 * amounts, workout/rest mentions, an explicit "n/5" or mood word, and a body
 * weight in kg — anything subtler is what the real parser is for.
 */
/** Words people type instead of a symbol, per currency. */
const CURRENCY_WORDS: Record<string, string[]> = {
  BDT: ["taka", "tk"],
  USD: ["dollars", "dollar", "usd", "bucks"],
  EUR: ["euros", "euro", "eur"],
  GBP: ["pounds", "pound", "gbp", "quid"],
  INR: ["rupees", "rupee", "inr"],
  PKR: ["rupees", "rupee", "pkr"],
  JPY: ["yen", "jpy"],
};

const escapeRx = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, (m) => `\\${m}`);

/**
 * "৳400" / "400 taka" / "$12" / "12 dollars", in whichever currency the user is
 * on. Symbol may lead, words and the ISO code may trail.
 */
function moneyPattern(currency?: string, locale?: string): RegExp {
  const code = normalizeCurrency(currency);
  const symbol = currencySymbol(code, locale);
  const words = [...new Set([symbol, code, ...(CURRENCY_WORDS[code] ?? [])])].map(escapeRx);
  const alt = words.join("|");
  const num = String.raw`\d+(?:\.\d+)?`;
  return new RegExp(
    String.raw`(?:(?:${escapeRx(symbol)})\s*(${num}))|(${num})\s*(?:${alt})\b`,
    "i",
  );
}

export function demoParse(sentence: string, ctx: LogContext): ParseResult {
  const intents: LogIntent[] = [];
  const date = /\byesterday\b/i.test(sentence) ? ctx.yesterday : ctx.today;

  // Money: "৳400", "400 taka", "$12", "12 dollars" — the pattern is built from
  // the user's own currency, so the demo parser is not stuck on Taka.
  const hit = sentence.match(moneyPattern(ctx.currency, ctx.locale));
  if (hit) {
    const amount = Number(hit[1] ?? hit[2]);
    const on = sentence.match(/\bon\s+([a-z\s]{2,20}?)(?:[,.]|\band\b|$)/i);
    const hint = (on?.[1] ?? "").trim();
    if (amount > 0) intents.push({ kind: "expense", amount, categoryHint: hint, date });
  }

  // Workout
  if (REST_WORDS.test(sentence)) {
    intents.push({ kind: "workout", done: false, planLabel: "", date });
  } else {
    const w = sentence.match(WORKOUT_WORDS);
    if (w) {
      const label = w[0].toLowerCase();
      const plan = /push|pull|legs|core|cardio|full body/.test(label)
        ? label.replace(/\b\w/g, (c) => c.toUpperCase())
        : /ran|run|jog/.test(label)
          ? "Cardio"
          : "Session";
      intents.push({ kind: "workout", done: true, planLabel: plan, date });
    }
  }

  // Body weight: "78.5 kg"
  const kg = sentence.match(/(\d+(?:\.\d+)?)\s*kgs?\b/i);
  if (kg) intents.push({ kind: "weight", weightKg: Number(kg[1]), date });

  // Mood: explicit "4/5" wins over a feeling word.
  const rated = sentence.match(/\b([1-5])\s*\/\s*5\b/);
  const worded = MOOD_WORDS.find(([re]) => re.test(sentence));
  const mood = rated ? (Number(rated[1]) as 1 | 2 | 3 | 4 | 5) : worded?.[1];
  if (mood) intents.push({ kind: "journal", mood, date });

  return { intents };
}

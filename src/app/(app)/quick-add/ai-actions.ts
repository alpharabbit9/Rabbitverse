"use server";

/*
  AI natural-language logging — the server half (V2 Pillar 1).

    parseLog(sentence)      sentence → Groq (JSON mode) → zod-validated intents
                            → dispatch descriptors for the review UI.
    saveIntents(dispatches) reviewed dispatches → the EXISTING V1 Server Actions
                            (addExpense / setWorkout / logWeight / saveJournal /
                            logProgress), each already auth-guarded, RLS-scoped
                            and today/yesterday-validated.

  Nothing here writes to Supabase directly — that's the point. This module only
  parses, validates, and fans out. The context the model sees (categories, active
  projects, today/yesterday) is built server-side from the session, never taken
  from the client.
*/

import { revalidatePath } from "next/cache";
import { GROQ_MODEL, getGroq, isGroqConfigured } from "@/lib/ai/groq";
import {
  type Dispatch,
  type LogContext,
  SYSTEM_PROMPT,
  buildUserPrompt,
  demoParse,
  dispatchSchema,
  dispatchUnresolved,
  parseResultSchema,
  resultToDispatches,
  sanitizeFields,
} from "@/lib/ai/parse-log";
import { addDays } from "@/lib/dates";
import { categories as sampleCategories, projects as sampleProjects } from "@/lib/sample-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { addExpense } from "./actions";
import { logProgress } from "../projects/actions";
import { saveJournal } from "../mental-health/actions";
import { logWeight, setWorkoutDay } from "../workout/actions";
import { currentDay, getLocaleContext } from "@/lib/session";

/** Longest sentence we'll send to the model — bounds tokens and abuse. */
const MAX_SENTENCE = 500;

export type ParseResponse = {
  ok: boolean;
  dispatches: Dispatch[];
  /** Set when the parse came from the offline demo parser rather than Groq. */
  demo: boolean;
  error: string | null;
};

export type SaveResponse = {
  ok: boolean;
  saved: number;
  /**
   * Per-item failures, keyed by the item's index in the submitted array so the
   * UI can keep exactly the bad chips and drop the saved ones — matching on the
   * summary would mis-handle two identical entries where only one failed.
   */
  failures: { index: number; summary: string; error: string }[];
  demo: boolean;
  error: string | null;
};

// ---- Context ---------------------------------------------------------------

/**
 * Build the parser's context from the signed-in user's own data. In demo mode
 * (or signed out) we fall back to the sample categories/projects so the flow
 * still previews. Returns `null` for `live` when there's no session.
 */
async function buildContext(): Promise<{ ctx: LogContext; live: boolean }> {
  const today = await currentDay();
  const yesterday = addDays(today, -1);
  // The model is told the user's currency and zone, so "spent 400" is read as
  // their money and "tonight" resolves on their clock.
  const locale = await getLocaleContext();
  const demoCtx: LogContext = {
    categories: sampleCategories.map((c) => ({ id: c.id, name: c.name })),
    projects: sampleProjects.filter((p) => p.status === "ongoing").map((p) => ({ id: p.id, name: p.name })),
    today,
    yesterday,
    ...locale,
  };

  if (!isSupabaseConfigured) return { ctx: demoCtx, live: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ctx: demoCtx, live: false };

  const [{ data: categories }, { data: projects }] = await Promise.all([
    supabase.from("expense_categories").select("id,name").order("name"),
    supabase.from("projects").select("id,name").eq("status", "ongoing").order("created_at"),
  ]);

  return {
    ctx: {
      categories: (categories ?? []).map((c) => ({ id: String(c.id), name: String(c.name) })),
      projects: (projects ?? []).map((p) => ({ id: String(p.id), name: String(p.name) })),
      today,
      yesterday,
      ...locale,
    },
    live: true,
  };
}

// ---- parseLog --------------------------------------------------------------

/**
 * Turn one sentence into reviewable dispatch descriptors. Never throws: a
 * missing key, a network failure, or malformed model output all come back as
 * `{ ok: false, error }` so the box can show a message and keep the sentence.
 */
export async function parseLog(sentence: string): Promise<ParseResponse> {
  const text = (sentence ?? "").trim().slice(0, MAX_SENTENCE);
  if (!text) return { ok: false, dispatches: [], demo: false, error: "Tell Rabbit what you did first." };

  const { ctx, live } = await buildContext();

  // No session or no key → the offline parser, so the flow still previews.
  if (!live || !isGroqConfigured()) {
    return { ok: true, dispatches: resultToDispatches(demoParse(text, ctx), ctx), demo: true, error: null };
  }

  let raw: string;
  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(text, ctx) },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "The parser is unreachable.";
    return { ok: false, dispatches: [], demo: false, error: `Couldn't reach the parser — ${msg}` };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, dispatches: [], demo: false, error: "Rabbit couldn't read that — try rephrasing." };
  }

  const parsed = parseResultSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, dispatches: [], demo: false, error: "Rabbit couldn't read that — try rephrasing." };
  }

  return { ok: true, dispatches: resultToDispatches(parsed.data, ctx), demo: false, error: null };
}

// ---- saveIntents -----------------------------------------------------------

const ACTIONS = {
  addExpense,
  setWorkout: setWorkoutDay,
  logWeight,
  saveJournal,
  logProgress,
} as const;

/**
 * Dispatch reviewed items through the existing write actions, one at a time.
 *
 * Two reasons this is a single action rather than N calls from the client:
 * Next dispatches Server Actions sequentially per client anyway, and doing the
 * fan-out here means one round trip and one consistent re-render. The client's
 * payload is re-validated (shape, action whitelist, field whitelist, required
 * fields) before anything is written — and each target action still re-checks
 * auth and the today/yesterday window itself.
 */
export async function saveIntents(dispatches: unknown): Promise<SaveResponse> {
  const parsed = dispatchSchema.array().max(10).safeParse(dispatches);
  if (!parsed.success) return { ok: false, saved: 0, failures: [], demo: false, error: "That review looks malformed." };
  if (!parsed.data.length) return { ok: false, saved: 0, failures: [], demo: false, error: "Nothing to save." };

  const { live } = await buildContext();
  if (!live) {
    return { ok: true, saved: parsed.data.length, failures: [], demo: true, error: null };
  }

  const failures: SaveResponse["failures"] = [];
  let saved = 0;

  for (const [index, d] of parsed.data.entries()) {
    const missing = dispatchUnresolved(d);
    if (missing.length) {
      failures.push({ index, summary: d.summary, error: "Still missing a detail." });
      continue;
    }

    const fd = new FormData();
    for (const [k, v] of Object.entries(sanitizeFields(d.action, d.fields))) fd.set(k, v);

    const res = await ACTIONS[d.action]({ ok: false, error: null }, fd);
    if (res.ok) saved += 1;
    else failures.push({ index, summary: d.summary, error: res.error ?? "Could not save." });
  }

  revalidatePath("/quick-add");
  revalidatePath("/");

  return {
    ok: saved > 0,
    saved,
    failures,
    demo: false,
    error: saved === 0 ? (failures[0]?.error ?? "Nothing was saved.") : null,
  };
}

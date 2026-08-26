import { describe, expect, it } from "vitest";
import {
  type LogContext,
  type LogIntent,
  demoParse,
  dispatchSchema,
  dispatchUnresolved,
  intentToDispatch,
  parseResultSchema,
  resolveRef,
  resultToDispatches,
  sanitizeFields,
} from "./parse-log";

const ctx: LogContext = {
  categories: [
    { id: "cat-food", name: "Food" },
    { id: "cat-transport", name: "Transport" },
  ],
  projects: [{ id: "proj-book", name: "Write a book" }],
  today: "2026-08-26",
  yesterday: "2026-08-25",
};

describe("resolveRef", () => {
  it("matches exactly, case-insensitively", () => {
    expect(resolveRef("food", ctx.categories)?.id).toBe("cat-food");
  });
  it("matches on substring either direction", () => {
    expect(resolveRef("book", ctx.projects)?.id).toBe("proj-book");
    expect(resolveRef("Write a book today", ctx.projects)?.id).toBe("proj-book");
  });
  it("returns null when nothing matches", () => {
    expect(resolveRef("groceries", ctx.categories)).toBeNull();
    expect(resolveRef("", ctx.categories)).toBeNull();
  });
});

describe("intentToDispatch", () => {
  it("maps an expense and resolves the category", () => {
    const intent: LogIntent = { kind: "expense", amount: 400, categoryHint: "Food", note: "lunch", date: "2026-08-26" };
    const d = intentToDispatch(intent, ctx);
    expect(d.action).toBe("addExpense");
    expect(d.fields).toEqual({ amount: "400", category_id: "cat-food", spent_at: "2026-08-26", note: "lunch" });
    expect(d.unresolved).toEqual([]);
  });

  it("clamps an out-of-window date to today and flags an unknown category", () => {
    const intent: LogIntent = { kind: "expense", amount: 100, categoryHint: "Gadgets", date: "2020-01-01" };
    const d = intentToDispatch(intent, ctx);
    expect(d.fields.spent_at).toBe("2026-08-26");
    expect(d.fields.category_id).toBe("");
    expect(d.unresolved).toContain("category_id");
  });

  it("keeps yesterday when the model returns it", () => {
    const intent: LogIntent = { kind: "journal", mood: 4, date: "2026-08-25" };
    expect(intentToDispatch(intent, ctx).fields.entry_date).toBe("2026-08-25");
  });

  it("maps a completed workout and a rest day", () => {
    expect(intentToDispatch({ kind: "workout", done: true, planLabel: "Legs" }, ctx).fields).toEqual({
      done: "true",
      plan_label: "Legs",
      log_date: ctx.today,
    });
    expect(intentToDispatch({ kind: "workout", done: false, planLabel: "" }, ctx).summary).toBe("Rest day");
  });

  it("keeps a workout on yesterday, and clamps anything outside the window", () => {
    const y = intentToDispatch({ kind: "workout", done: false, planLabel: "", date: ctx.yesterday }, ctx);
    expect(y.fields.log_date).toBe(ctx.yesterday);
    const old = intentToDispatch({ kind: "workout", done: true, planLabel: "Push", date: "2020-01-01" }, ctx);
    expect(old.fields.log_date).toBe(ctx.today);
  });

  it("maps weight and flags missing weight", () => {
    const withWeight = intentToDispatch({ kind: "weight", weightKg: 78.5, bodyFatPct: 18 }, ctx);
    expect(withWeight.fields).toEqual({ weight: "78.5", body_fat: "18", log_date: ctx.today });
    expect(withWeight.unresolved).toEqual([]);

    const noWeight = intentToDispatch({ kind: "weight", bodyFatPct: 18 }, ctx);
    expect(noWeight.fields.weight).toBeUndefined();
    expect(noWeight.unresolved).toContain("weight");
  });

  it("flags a journal entry with no mood", () => {
    const d = intentToDispatch({ kind: "journal", body: "busy day", date: "2026-08-26" }, ctx);
    expect(d.fields.mood).toBeUndefined();
    expect(d.unresolved).toContain("mood");
  });

  it("maps project progress and flags an unknown project", () => {
    const known = intentToDispatch({ kind: "project", projectHint: "book", amount: 500 }, ctx);
    expect(known.fields).toEqual({ project_id: "proj-book", amount: "500", log_date: ctx.today });
    expect(known.unresolved).toEqual([]);

    const unknown = intentToDispatch({ kind: "project", projectHint: "startup", amount: 1 }, ctx);
    expect(unknown.fields.project_id).toBe("");
    expect(unknown.unresolved).toContain("project_id");
  });
});

describe("parseResultSchema", () => {
  it("accepts a well-formed multi-intent response and dispatches it", () => {
    const raw = {
      intents: [
        { kind: "expense", amount: 400, categoryHint: "Food", date: "2026-08-26" },
        { kind: "workout", done: true, planLabel: "Legs", date: "2026-08-26" },
        { kind: "journal", mood: 4, date: "2026-08-26" },
      ],
    };
    const parsed = parseResultSchema.parse(raw);
    const dispatches = resultToDispatches(parsed, ctx);
    expect(dispatches.map((d) => d.action)).toEqual(["addExpense", "setWorkout", "saveJournal"]);
  });

  it("rejects malformed output (bad mood, missing amount)", () => {
    expect(parseResultSchema.safeParse({ intents: [{ kind: "journal", mood: 9, date: "2026-08-26" }] }).success).toBe(false);
    expect(parseResultSchema.safeParse({ intents: [{ kind: "expense", categoryHint: "Food", date: "2026-08-26" }] }).success).toBe(false);
    expect(parseResultSchema.safeParse({ intents: [{ kind: "unknown" }] }).success).toBe(false);
  });

  it("accepts an empty intent list", () => {
    expect(parseResultSchema.parse({ intents: [] }).intents).toEqual([]);
  });
});

describe("dispatchUnresolved", () => {
  it("reports the required fields a chip is still missing", () => {
    expect(dispatchUnresolved({ action: "addExpense", fields: { amount: "400" } })).toEqual(["category_id"]);
    expect(dispatchUnresolved({ action: "addExpense", fields: { amount: "400", category_id: "cat-food" } })).toEqual([]);
    expect(dispatchUnresolved({ action: "saveJournal", fields: { entry_date: "2026-08-26" } })).toEqual(["mood"]);
    expect(dispatchUnresolved({ action: "logWeight", fields: { body_fat: "18" } })).toEqual(["weight"]);
  });

  it("treats a whitespace-only value as missing", () => {
    expect(dispatchUnresolved({ action: "logProgress", fields: { project_id: "  ", amount: "5" } })).toEqual(["project_id"]);
  });

  it("accepts a rest day, where done is the literal string false", () => {
    expect(dispatchUnresolved({ action: "setWorkout", fields: { done: "false" } })).toEqual([]);
  });
});

describe("sanitizeFields", () => {
  it("keeps only the keys the target action reads", () => {
    const dirty = { amount: "400", category_id: "cat-food", user_id: "someone-else", id: "row-1", note: "" };
    expect(sanitizeFields("addExpense", dirty)).toEqual({ amount: "400", category_id: "cat-food" });
  });

  it("drops empty values so actions fall back to their own defaults", () => {
    expect(sanitizeFields("logWeight", { weight: "78.5", body_fat: "" })).toEqual({ weight: "78.5" });
  });
});

describe("dispatchSchema", () => {
  it("accepts a well-formed reviewed chip", () => {
    const d = intentToDispatch({ kind: "expense", amount: 400, categoryHint: "Food", date: "2026-08-26" }, ctx);
    expect(dispatchSchema.safeParse(d).success).toBe(true);
  });

  it("rejects an unknown action or a non-string field value", () => {
    expect(dispatchSchema.safeParse({ kind: "expense", action: "dropTable", fields: {}, summary: "", unresolved: [] }).success).toBe(false);
    expect(
      dispatchSchema.safeParse({ kind: "expense", action: "addExpense", fields: { amount: 400 }, summary: "", unresolved: [] }).success,
    ).toBe(false);
  });
});

describe("demoParse", () => {
  it("picks up a spend, a workout and a rating from one sentence", () => {
    const r = demoParse("spent ৳450 on lunch, did legs, feeling good 4/5", ctx);
    expect(r.intents).toEqual([
      { kind: "expense", amount: 450, categoryHint: "lunch", date: ctx.today },
      { kind: "workout", done: true, planLabel: "Legs", date: ctx.today },
      { kind: "journal", mood: 4, date: ctx.today },
    ]);
  });

  it("routes yesterday to yesterday and reads a rest day", () => {
    const r = demoParse("yesterday was a rest day", ctx);
    expect(r.intents).toEqual([{ kind: "workout", done: false, planLabel: "", date: ctx.yesterday }]);
    expect(demoParse("yesterday I spent 300 taka", ctx).intents[0]).toMatchObject({ date: ctx.yesterday });
  });

  it("dates a whole 'yesterday: ...' sentence to yesterday, workout included", () => {
    const r = demoParse("yesterday: ৳1200 on groceries and a rest day", ctx);
    expect(r.intents.map((i) => i.kind)).toEqual(["expense", "workout"]);
    const [expense, workout] = resultToDispatches(r, ctx);
    expect(expense.fields.spent_at).toBe(ctx.yesterday);
    expect(workout.fields.log_date).toBe(ctx.yesterday);
  });

  it("reads a body weight and returns nothing for an empty day", () => {
    expect(demoParse("78.5kg this morning", ctx).intents).toContainEqual({
      kind: "weight",
      weightKg: 78.5,
      date: ctx.today,
    });
    expect(demoParse("nothing much happened", ctx).intents).toEqual([]);
  });

  it("dates a weigh-in mentioned as yesterday to yesterday", () => {
    // The bug this covers: the weight intent had no date at all, so
    // "yesterday I weighed 78kg" overwrote today's row instead.
    const r = demoParse("yesterday I was 78kg", ctx);
    expect(r.intents).toContainEqual({ kind: "weight", weightKg: 78, date: ctx.yesterday });
    expect(resultToDispatches(r, ctx)[0].fields.log_date).toBe(ctx.yesterday);
  });
});

describe("date handling on the weight and project intents", () => {
  it("files a weigh-in against the day it names", () => {
    const yday: LogIntent = { kind: "weight", weightKg: 78.5, date: ctx.yesterday };
    expect(intentToDispatch(yday, ctx).fields.log_date).toBe(ctx.yesterday);
  });

  it("defaults a dateless weigh-in to today", () => {
    const bare: LogIntent = { kind: "weight", weightKg: 78.5 };
    expect(intentToDispatch(bare, ctx).fields.log_date).toBe(ctx.today);
  });

  it("clamps a weigh-in outside the window back to today", () => {
    const old: LogIntent = { kind: "weight", weightKg: 78.5, date: "2026-01-01" };
    expect(intentToDispatch(old, ctx).fields.log_date).toBe(ctx.today);
  });

  it("dates project progress the same way", () => {
    const yday: LogIntent = { kind: "project", projectHint: "book", amount: 2, date: ctx.yesterday };
    expect(intentToDispatch(yday, ctx).fields.log_date).toBe(ctx.yesterday);
    const bare: LogIntent = { kind: "project", projectHint: "book", amount: 2 };
    expect(intentToDispatch(bare, ctx).fields.log_date).toBe(ctx.today);
  });

  it("lets log_date through the field whitelist for both actions", () => {
    expect(sanitizeFields("logWeight", { weight: "78", log_date: ctx.yesterday, user_id: "hack" })).toEqual({
      weight: "78",
      log_date: ctx.yesterday,
    });
    expect(sanitizeFields("logProgress", { project_id: "p", amount: "2", log_date: ctx.yesterday })).toEqual({
      project_id: "p",
      amount: "2",
      log_date: ctx.yesterday,
    });
  });
});

/*
  Shared read-path building blocks used across the per-feature data modules.

  Server-only: the getters that consume these use the cookie-bound Supabase
  server client and must only be imported from Server Components / Server Actions
  (never a "use client" module).
*/
import type {
  BodyMetric,
  Expense,
  ExpenseCategory,
  JournalEntry,
  Project,
  ProjectTask,
  WorkoutLog,
  WorkoutPlanDay,
} from "@/lib/types";

/** Weekly spending budget (৳). Static for v1; can move to profile settings later. */
export const WEEKLY_BUDGET = 6000;
export const HEATMAP_DAYS = 364;

// ---- row → domain shapers -------------------------------------------------

export function shapeCategories(rows: Record<string, unknown>[] | null): ExpenseCategory[] {
  return (rows ?? []).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    color: String(c.color ?? "var(--accent-cyan)"),
    icon: String(c.icon ?? "Sparkles"),
  }));
}

export function shapeExpenses(rows: Record<string, unknown>[] | null): Expense[] {
  return (rows ?? []).map((e) => ({
    id: String(e.id),
    date: String(e.spent_at),
    amount: Number(e.amount),
    categoryId: e.category_id ? String(e.category_id) : "",
    note: e.note ? String(e.note) : undefined,
  }));
}

export function shapeProjects(rows: Record<string, unknown>[] | null): Project[] {
  return (rows ?? []).map((p) => ({
    id: String(p.id),
    name: String(p.name),
    description: p.description ? String(p.description) : undefined,
    goals: p.goals ? String(p.goals) : undefined,
    targetValue: Number(p.target_value),
    targetUnit: String(p.target_unit ?? "%"),
    current: Number(p.current_value ?? 0),
    status: p.status === "completed" ? "completed" : "ongoing",
    startDate: String(p.start_date),
    targetDate: p.target_date ? String(p.target_date) : undefined,
  }));
}

export function shapeTasks(rows: Record<string, unknown>[] | null): ProjectTask[] {
  return (rows ?? []).map((t) => ({ id: String(t.id), title: String(t.title), done: Boolean(t.done) }));
}

export function shapeWorkoutLogs(rows: Record<string, unknown>[] | null): WorkoutLog[] {
  return (rows ?? []).map((w) => ({
    date: String(w.log_date),
    done: Boolean(w.done),
    planLabel: w.plan_label ? String(w.plan_label) : "",
    note: w.note ? String(w.note) : undefined,
  }));
}

export function shapeBodyMetrics(rows: Record<string, unknown>[] | null): BodyMetric[] {
  return (rows ?? [])
    .filter((m) => m.weight_kg != null)
    .map((m) => ({
      date: String(m.log_date),
      weightKg: Number(m.weight_kg),
      bodyFatPct: m.body_fat_pct != null ? Number(m.body_fat_pct) : undefined,
    }));
}

export function shapePlan(rows: Record<string, unknown>[] | null): WorkoutPlanDay[] {
  return (rows ?? [])
    .map((d) => ({ weekday: Number(d.weekday), label: String(d.label), focus: String(d.focus ?? "") }))
    .sort((a, b) => a.weekday - b.weekday);
}

export function shapeJournal(rows: Record<string, unknown>[] | null): JournalEntry[] {
  return (rows ?? []).map((j) => ({
    id: String(j.id),
    date: String(j.entry_date),
    mood: Math.min(5, Math.max(1, Number(j.mood))) as JournalEntry["mood"],
    body: j.body ? String(j.body) : "",
  }));
}

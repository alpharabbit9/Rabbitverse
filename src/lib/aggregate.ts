/*
  Pure aggregation helpers shared by the sample-data preview and the real
  Supabase read path. Given the same domain-typed arrays (Expense[], Project[],
  …) these produce identical dashboards whether the rows are seeded or real.

  Everything here is dependency-free and side-effect-free so it can run in a
  Server Component, a Client Component, or a test.
*/
import { addDays, eachDay } from "./dates";
import { lifeScore, type LifeSignals } from "./life-score";
import type {
  DayActivity,
  Expense,
  JournalEntry,
  Project,
  SectionKey,
  WorkoutLog,
} from "./types";

export type SectionCounts = Record<SectionKey, number>;

export function emptyCounts(): SectionCounts {
  return { projects: 0, workout: 0, expenses: 0, mental: 0 };
}

/** Build a dense DayActivity[] over [start, end] from a sparse per-date counts map. */
export function buildActivity(
  start: string,
  end: string,
  byDate: Map<string, Partial<SectionCounts>>,
): DayActivity[] {
  return eachDay(start, end).map((date) => {
    const c = byDate.get(date);
    return {
      date,
      counts: {
        projects: c?.projects ?? 0,
        workout: c?.workout ?? 0,
        expenses: c?.expenses ?? 0,
        mental: c?.mental ?? 0,
      },
    };
  });
}

/** Add 1 (or `n`) to a section's count for a given day inside a counts map. */
export function bump(
  byDate: Map<string, Partial<SectionCounts>>,
  date: string,
  section: SectionKey,
  n = 1,
) {
  const c = byDate.get(date) ?? {};
  c[section] = (c[section] ?? 0) + n;
  byDate.set(date, c);
}

const hasAny = (a: DayActivity | undefined) =>
  !!a && (a.counts.projects > 0 || a.counts.workout > 0 || a.counts.expenses > 0 || a.counts.mental > 0);

/**
 * Current streak: consecutive days with any activity, ending today (or
 * yesterday if today hasn't been logged yet, so the streak survives until
 * end-of-day).
 */
export function computeStreak(activity: DayActivity[], today: string): number {
  const active = new Set(activity.filter(hasAny).map((a) => a.date));
  let cur = active.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (active.has(cur)) {
    streak++;
    cur = addDays(cur, -1);
  }
  return streak;
}

export interface SignalInput {
  today: string;
  projects: Project[];
  workoutLogs: WorkoutLog[];
  expenses: Expense[];
  journal: JournalEntry[];
  activity: DayActivity[];
  streakDays: number;
  /** weekly spending budget in ৳ */
  budget: number;
}

/** The five 0–100 life signals for the rolling last-7-days window ending `today`. */
export function computeSignals(d: SignalInput): LifeSignals {
  const last7 = eachDay(addDays(d.today, -6), d.today);
  const last7set = new Set(last7);

  const ongoing = d.projects.filter((p) => p.status === "ongoing");
  const productivity = ongoing.length
    ? ongoing.reduce((a, p) => a + Math.min(100, (p.current / Math.max(1, p.targetValue)) * 100), 0) / ongoing.length
    : 0;

  const weekWorkouts = d.workoutLogs.filter((w) => last7set.has(w.date) && w.done).length;
  const fitness = Math.min(100, (weekWorkouts / 5) * 100);

  const weekSpend = d.expenses.filter((e) => last7set.has(e.date)).reduce((a, e) => a + e.amount, 0);
  const budget = d.budget || 6000;
  const money = Math.round(Math.max(20, Math.min(100, (1 - (weekSpend - budget) / budget) * 100)));

  const recentMoods = d.journal.filter((j) => last7set.has(j.date));
  const avgMood = recentMoods.length ? recentMoods.reduce((a, j) => a + j.mood, 0) / recentMoods.length : 3.5;
  const mental = Math.round((avgMood / 5) * 100);

  const activeMap = new Set(d.activity.filter(hasAny).map((a) => a.date));
  const activeDays = last7.filter((day) => activeMap.has(day)).length;
  const focus = Math.round((activeDays / 7) * 100);

  return {
    productivity: Math.round(productivity),
    fitness: Math.round(fitness),
    money,
    mental,
    focus,
    streakDays: d.streakDays,
  };
}

/**
 * Real Life-Score trend: for each of the last `days` days, the score of the
 * 7-day window ending that day (streak recomputed up to that day). Cheap for a
 * single user and, unlike the sample ramp, actually reflects history.
 */
export function computeLifeTrend(
  base: Omit<SignalInput, "today" | "streakDays">,
  today: string,
  days = 30,
): { date: string; value: number }[] {
  return eachDay(addDays(today, -(days - 1)), today).map((date) => {
    const streakDays = computeStreak(base.activity, date);
    const s = computeSignals({ ...base, today: date, streakDays });
    return { date, value: lifeScore(s) };
  });
}

/**
 * Light gamification derived from real usage: level climbs as active days
 * accumulate. `xp`/`xpToNext` describe progress within the current level so the
 * sidebar bar fills smoothly.
 */
export function progressionFromActiveDays(activeDays: number): {
  level: number;
  xp: number;
  xpToNext: number;
} {
  const perLevel = 5; // active days per level
  const level = 1 + Math.floor(activeDays / perLevel);
  const intoLevel = activeDays % perLevel;
  return { level, xp: intoLevel, xpToNext: perLevel };
}

/** How many days in the window had any activity. */
export function activeDayCount(activity: DayActivity[]): number {
  return activity.filter(hasAny).length;
}

/*
  Targets & warnings — Pillar 2 of V2.

  Two halves, both PURE (no Supabase, no React, safe on client or server):
    1. the `Targets` shape the user sets in Settings, its defaults, and the
       normaliser that reads it back out of `user_profiles.settings` JSONB;
    2. `computeTargetStatuses`, which compares those targets against the same
       domain arrays the dashboards already load and returns a typed
       `TargetStatus[]` for the UI to render.

  Nothing here queries or writes — the read path hands it rows, `saveTargets`
  (settings/actions.ts) does the writing.
*/
import { daysBetween, endOfMonth, shortDate, startOfMonth, startOfWeek, weekdayMon0 } from "./dates";
import { money } from "./money";
import type { Expense, JournalEntry, Project, SectionKey, WorkoutLog } from "./types";

// ---------------------------------------------------------------- the shape

/**
 * Every target is `number | null`, where **null means "no target"** — the
 * warning for it is simply not produced. A missing key falls back to the
 * default below, so a profile that has never opened the Targets card still
 * gets sensible guardrails.
 */
export interface Targets {
  /** Spend ceiling for a calendar month in the user's timezone. */
  monthlyExpenseCap: number | null;
  /** Spend ceiling for a Mon-start week. Also feeds the Life-Score money signal. */
  weeklyExpenseCap: number | null;
  /** Workout sessions per week. */
  weeklyWorkouts: number | null;
  /** Mental-health check-ins (journal entries) per week. */
  weeklyCheckIns: number | null;
}

export const DEFAULT_TARGETS: Targets = {
  monthlyExpenseCap: 20000,
  weeklyExpenseCap: 6000,
  weeklyWorkouts: 4,
  weeklyCheckIns: 5,
};

/** Sane bounds per field — enforced both in the form and in `saveTargets`. */
export const TARGET_LIMITS: Record<keyof Targets, { min: number; max: number }> = {
  monthlyExpenseCap: { min: 100, max: 10_000_000 },
  weeklyExpenseCap: { min: 100, max: 10_000_000 },
  weeklyWorkouts: { min: 1, max: 14 },
  weeklyCheckIns: { min: 1, max: 7 },
};

export const TARGET_KEYS = Object.keys(DEFAULT_TARGETS) as (keyof Targets)[];

/** Clamp one field to its limits, or null it out when the value isn't usable. */
export function coerceTarget(key: keyof Targets, value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const { min, max } = TARGET_LIMITS[key];
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Read a `Targets` out of whatever `user_profiles.settings.targets` holds.
 * Explicit `null` = the user switched that target off; an absent key falls back
 * to the default so guardrails exist before the card is ever opened.
 */
export function parseTargets(raw: unknown): Targets {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_TARGETS };
  for (const key of TARGET_KEYS) {
    if (!(key in src)) continue;
    out[key] = coerceTarget(key, src[key]);
  }
  return out;
}

// -------------------------------------------------------------- the statuses

export type TargetLevel = "ok" | "warn" | "over";

export interface TargetStatus {
  /** stable per-target key — `project-<id>` for the per-project ones */
  id: string;
  section: SectionKey;
  level: TargetLevel;
  /** short headline, e.g. "Over your monthly cap" */
  label: string;
  /** the numbers behind it, e.g. "৳21,400 of ৳20,000 · ৳1,400 over" (user's currency) */
  detail: string;
  /** 0–1+ progress toward the target (spend ratio, sessions done ÷ target) */
  progress: number;
}

/** Fraction of a spend cap at which Rabbit starts warning (amber). */
export const WARN_RATIO = 0.8;
/** How far a project may lag the clock before it counts as behind pace. */
export const BEHIND_PACE_SLACK = 0.15;

/** Formats a whole-currency figure. Built per call from the user's profile. */
type MoneyFmt = (n: number) => string;
const moneyFmt = (currency?: string, locale?: string): MoneyFmt =>
  (n: number) => money(Math.round(n), { currency, locale });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** ok / warn / over for "spent X against a cap of Y over a period". */
function spendStatus(
  id: string,
  period: string,
  cap: number,
  spent: number,
  daysLeft: number,
  fmt: MoneyFmt,
): TargetStatus {
  const ratio = spent / cap;
  const level: TargetLevel = spent > cap ? "over" : ratio >= WARN_RATIO ? "warn" : "ok";
  const label =
    level === "over"
      ? `Over your ${period} cap`
      : level === "warn"
        ? `Close to your ${period} cap`
        : `${period[0].toUpperCase()}${period.slice(1)} spending on track`;
  const gap = level === "over" ? `${fmt(spent - cap)} over` : `${fmt(cap - spent)} left`;
  return {
    id,
    section: "expenses",
    level,
    label,
    detail: `${fmt(spent)} of ${fmt(cap)} · ${gap} · ${plural(daysLeft, "day")} to go`,
    progress: ratio,
  };
}

/** ok / warn / over for "did X of a weekly target of Y, with N days still left". */
function paceStatus(
  id: string,
  section: SectionKey,
  noun: string,
  target: number,
  done: number,
  daysLeft: number,
): TargetStatus {
  const needed = Math.max(0, target - done);
  const counts = `${done} of ${target} this week`;
  if (needed === 0) {
    return { id, section, level: "ok", label: `Weekly ${noun} target hit`, detail: counts, progress: done / target };
  }
  // Can't fit the remaining sessions into the days that are left → already lost.
  if (needed > daysLeft) {
    return {
      id,
      section,
      level: "over",
      label: `Behind on ${noun}`,
      detail: `${counts} · only ${plural(daysLeft, "day")} left`,
      progress: done / target,
    };
  }
  // No slack left: every remaining day has to count.
  if (daysLeft - needed <= 1) {
    return {
      id,
      section,
      level: "warn",
      label: `${plural(needed, noun.replace(/s$/, ""))} to go`,
      detail: `${counts} · ${plural(daysLeft, "day")} left`,
      progress: done / target,
    };
  }
  return { id, section, level: "ok", label: `On pace for ${noun}`, detail: counts, progress: done / target };
}

/**
 * Percent complete as a 0–1 fraction, checklist-driven when the project has
 * tasks — the same rule the project views use for their rings, so a warning can
 * never quote a different number than the ring beside it.
 */
function progressFraction(p: Project): number {
  if (p.tasks && p.tasks.length) return p.tasks.filter((t) => t.done).length / p.tasks.length;
  return p.targetValue > 0 ? clamp01(p.current / p.targetValue) : 0;
}

/** Overdue / behind-pace for one ongoing project with an estimated finish date. */
export function projectTargetStatus(p: Project, today: string): TargetStatus | null {
  if (p.status === "completed" || p.status === "planned" || !p.targetDate) return null;
  const pct = progressFraction(p);
  const donePct = Math.round(pct * 100);
  const base = { id: `project-${p.id}`, section: "projects" as const, progress: pct };

  const daysLate = daysBetween(p.targetDate, today);
  if (daysLate > 0) {
    return {
      ...base,
      level: "over",
      label: `“${p.name}” is overdue`,
      detail: `Due ${shortDate(p.targetDate)} · ${plural(daysLate, "day")} ago · ${donePct}% done`,
    };
  }

  const span = daysBetween(p.startDate, p.targetDate);
  const timeFrac = span > 0 ? clamp01(daysBetween(p.startDate, today) / span) : 0;
  if (pct + BEHIND_PACE_SLACK < timeFrac) {
    return {
      ...base,
      level: "warn",
      label: `“${p.name}” is behind pace`,
      detail: `${donePct}% done · ${Math.round(timeFrac * 100)}% of the time gone · due ${shortDate(p.targetDate)}`,
    };
  }
  return {
    ...base,
    level: "ok",
    label: `“${p.name}” is on pace`,
    detail: `${donePct}% done · due ${shortDate(p.targetDate)}`,
  };
}

export interface TargetInput {
  today: string;
  targets: Targets;
  /**
   * The user's currency + language tag, so every amount in a warning is
   * formatted the way the rest of their app is. Omitted in tests and demo,
   * where the BDT/en defaults apply.
   */
  currency?: string;
  locale?: string;
  /**
   * Each array is optional so a section page can hand over only the slice it
   * loaded. Pair that with `targetsForSection` — otherwise an absent array
   * reads as "nothing logged" and would warn about a section you never fetched.
   */
  expenses?: Expense[];
  workoutLogs?: WorkoutLog[];
  journal?: JournalEntry[];
  projects?: Project[];
}

/**
 * Compare every set target against reality. Periods are calendar months and
 * Mon-start weeks in the user's own timezone (`lib/dates.ts`), matching every
 * other window in the app.
 * Targets the user switched off produce no status at all.
 */
export function computeTargetStatuses(d: TargetInput): TargetStatus[] {
  const out: TargetStatus[] = [];
  const { today, targets } = d;
  const fmt = moneyFmt(d.currency, d.locale);

  if (targets.monthlyExpenseCap) {
    const from = startOfMonth(today);
    const to = endOfMonth(today);
    const spent = (d.expenses ?? []).filter((e) => e.date >= from && e.date <= to).reduce((a, e) => a + e.amount, 0);
    out.push(spendStatus("expenses-month", "monthly", targets.monthlyExpenseCap, spent, daysBetween(today, to), fmt));
  }

  if (targets.weeklyExpenseCap) {
    const from = startOfWeek(today);
    const spent = (d.expenses ?? []).filter((e) => e.date >= from && e.date <= today).reduce((a, e) => a + e.amount, 0);
    out.push(spendStatus("expenses-week", "weekly", targets.weeklyExpenseCap, spent, 6 - weekdayMon0(today), fmt));
  }

  // Days still available this week, today included (Mon → 7 … Sun → 1).
  const daysLeftInWeek = 7 - weekdayMon0(today);
  const weekStart = startOfWeek(today);

  if (targets.weeklyWorkouts) {
    const done = (d.workoutLogs ?? []).filter((w) => w.done && w.date >= weekStart && w.date <= today).length;
    out.push(paceStatus("workout-week", "workout", "workouts", targets.weeklyWorkouts, done, daysLeftInWeek));
  }

  if (targets.weeklyCheckIns) {
    const done = new Set((d.journal ?? []).filter((j) => j.date >= weekStart && j.date <= today).map((j) => j.date)).size;
    out.push(paceStatus("mental-week", "mental", "check-ins", targets.weeklyCheckIns, done, daysLeftInWeek));
  }

  for (const p of d.projects ?? []) {
    const s = projectTargetStatus(p, today);
    if (s) out.push(s);
  }

  return out;
}

// ------------------------------------------------------------- UI selectors

const RANK: Record<TargetLevel, number> = { over: 0, warn: 1, ok: 2 };

/** Only the statuses worth interrupting for, worst first. */
export function attentionStatuses(list: TargetStatus[]): TargetStatus[] {
  return list.filter((s) => s.level !== "ok").sort((a, b) => RANK[a.level] - RANK[b.level]);
}

export function sectionStatuses(list: TargetStatus[], section: SectionKey): TargetStatus[] {
  return list.filter((s) => s.section === section).sort((a, b) => RANK[a.level] - RANK[b.level]);
}

/** The most severe level present — "ok" when everything is fine or empty. */
export function worstLevel(list: TargetStatus[]): TargetLevel {
  return list.reduce<TargetLevel>((worst, s) => (RANK[s.level] < RANK[worst] ? s.level : worst), "ok");
}

/** Which user-level targets a section's own data is able to evaluate. */
const SECTION_TARGETS: Record<SectionKey, (keyof Targets)[]> = {
  expenses: ["monthlyExpenseCap", "weeklyExpenseCap"],
  workout: ["weeklyWorkouts"],
  mental: ["weeklyCheckIns"],
  projects: [], // projects are judged per-project, from the projects array itself
};

/**
 * Blank out every target a section can't judge from its own rows. A section
 * page only loads its own slice, so without this an unfetched array would read
 * as "nothing logged" and warn about a section the page never asked about.
 */
export function targetsForSection(targets: Targets, section: SectionKey): Targets {
  const keep = new Set(SECTION_TARGETS[section]);
  const out = { ...targets };
  for (const k of TARGET_KEYS) if (!keep.has(k)) out[k] = null;
  return out;
}

/** The statuses one section can compute from the data it already has. */
export function sectionTargetStatuses(section: SectionKey, d: TargetInput): TargetStatus[] {
  return sectionStatuses(computeTargetStatuses({ ...d, targets: targetsForSection(d.targets, section) }), section);
}

/*
  Deterministic sample data so the UI is fully alive before Supabase is wired.
  Everything is generated from a seeded PRNG keyed on the day, so renders are
  stable. When real persistence lands, this module is swapped for Supabase
  selectors with the same shapes.
*/
import { addDays, dhakaToday, eachDay, weekdayMon0 } from "./dates";
import { lifeScore, moodState, scoreLabel, type LifeSignals } from "./life-score";
import type {
  BodyMetric,
  DayActivity,
  Expense,
  ExpenseCategory,
  JournalEntry,
  Profile,
  Project,
  SectionKey,
  TimelineEvent,
  WorkoutLog,
  WorkoutPlanDay,
} from "./types";

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedFromIso = (iso: string) => Number(iso.replace(/-/g, ""));

const TODAY = dhakaToday();
const YEAR_AGO = addDays(TODAY, -363);

export const profile: Profile = {
  name: "Rifat",
  level: 7,
  xp: 2450,
  xpToNext: 3300,
  streakDays: 12,
};

export const categories: ExpenseCategory[] = [
  { id: "food", name: "Food", color: "var(--accent-mint)", icon: "Utensils" },
  { id: "transport", name: "Transport", color: "var(--accent-blue)", icon: "Bus" },
  { id: "shopping", name: "Shopping", color: "var(--accent-purple)", icon: "ShoppingBag" },
  { id: "bills", name: "Bills", color: "var(--accent-gold)", icon: "ReceiptText" },
  { id: "health", name: "Health", color: "var(--accent-orange)", icon: "HeartPulse" },
  { id: "other", name: "Other", color: "var(--accent-cyan)", icon: "Sparkles" },
];

export const projects: Project[] = [
  { id: "p1", name: "Rabbit Verse App", description: "Ship v1 of the life dashboard", targetValue: 100, targetUnit: "%", current: 62, status: "ongoing", startDate: addDays(TODAY, -40) },
  { id: "p2", name: "Read 20 Books", description: "2026 reading goal", targetValue: 20, targetUnit: "books", current: 11, status: "ongoing", startDate: addDays(TODAY, -180) },
  { id: "p3", name: "Learn Spanish", description: "Daily practice sessions", targetValue: 60, targetUnit: "sessions", current: 24, status: "ongoing", startDate: addDays(TODAY, -70) },
  { id: "p4", name: "Portfolio Site", description: "Personal portfolio redesign", targetValue: 100, targetUnit: "%", current: 45, status: "ongoing", startDate: addDays(TODAY, -25) },
  { id: "p5", name: "Write 30k Words", description: "Blog + essays", targetValue: 30000, targetUnit: "words", current: 18400, status: "ongoing", startDate: addDays(TODAY, -55) },
  { id: "p6", name: "Save ৳50k", description: "Emergency fund", targetValue: 50000, targetUnit: "৳", current: 31000, status: "ongoing", startDate: addDays(TODAY, -90) },
  { id: "p7", name: "Portfolio Photoshoot", description: "Done and delivered", targetValue: 100, targetUnit: "%", current: 100, status: "completed", startDate: addDays(TODAY, -120) },
  { id: "p8", name: "React Course", description: "Completed advanced React", targetValue: 100, targetUnit: "%", current: 100, status: "completed", startDate: addDays(TODAY, -150) },
];

export const workoutPlan: WorkoutPlanDay[] = [
  { weekday: 0, label: "Push", focus: "Chest · Shoulders · Triceps" },
  { weekday: 1, label: "Pull", focus: "Back · Biceps" },
  { weekday: 2, label: "Legs", focus: "Quads · Hamstrings · Calves" },
  { weekday: 3, label: "Rest", focus: "Mobility & stretching" },
  { weekday: 4, label: "Upper", focus: "Chest · Back" },
  { weekday: 5, label: "Cardio", focus: "Run · Core" },
  { weekday: 6, label: "Rest", focus: "Recovery walk" },
];

// ---- generated series ----------------------------------------------------

function buildActivity(): DayActivity[] {
  const days = eachDay(YEAR_AGO, TODAY);
  return days.map((date, i) => {
    const r = mulberry32(seedFromIso(date));
    const recent = i > days.length - 14; // last ~2 weeks: dense (streak)
    const warmth = i / days.length; // more active recently
    const counts: Record<SectionKey, number> = {
      projects: r() < 0.35 + warmth * 0.45 || recent ? Math.floor(r() * 3) + (recent ? 1 : 0) : 0,
      workout: r() < 0.3 + warmth * 0.35 ? 1 : 0,
      expenses: r() < 0.55 + warmth * 0.3 ? Math.floor(r() * 3) + 1 : 0,
      mental: r() < 0.25 + warmth * 0.4 || recent ? 1 : 0,
    };
    return { date, counts };
  });
}

export const activity: DayActivity[] = buildActivity();

function buildExpenses(): Expense[] {
  const out: Expense[] = [];
  const days = eachDay(addDays(TODAY, -46), TODAY);
  for (const date of days) {
    const r = mulberry32(seedFromIso(date) + 7);
    const n = Math.floor(r() * 3);
    for (let k = 0; k <= n; k++) {
      const cat = categories[Math.floor(r() * categories.length)];
      const base = { food: 250, transport: 120, shopping: 900, bills: 1500, health: 600, other: 300 }[cat.id] ?? 300;
      const amount = Math.round((base * (0.5 + r())) / 10) * 10;
      out.push({ id: `${date}-${k}`, date, amount, categoryId: cat.id, note: undefined });
    }
  }
  // guarantee a "today" expense that matches the mockup vibe
  out.push({ id: `${TODAY}-lunch`, date: TODAY, amount: 450, categoryId: "food", note: "Lunch & coffee" });
  return out;
}

export const expenses: Expense[] = buildExpenses();

function buildWorkoutLogs(): WorkoutLog[] {
  return eachDay(addDays(TODAY, -34), TODAY).map((date) => {
    const wd = weekdayMon0(date);
    const plan = workoutPlan[wd];
    const r = mulberry32(seedFromIso(date) + 3);
    const isRest = plan.label === "Rest";
    const done = isRest ? false : r() < 0.82;
    return { date, done, planLabel: plan.label, note: undefined };
  });
}

export const workoutLogs: WorkoutLog[] = buildWorkoutLogs();

function buildBodyMetrics(): BodyMetric[] {
  // weekly weigh-ins, gentle downward trend
  const out: BodyMetric[] = [];
  let w = 78.5;
  for (const date of eachDay(addDays(TODAY, -84), TODAY)) {
    if (weekdayMon0(date) !== 0) continue;
    const r = mulberry32(seedFromIso(date) + 11);
    w = +(w - 0.25 + (r() - 0.5) * 0.4).toFixed(1);
    out.push({ date, weightKg: w, bodyFatPct: +(18 - (78.5 - w) * 0.3).toFixed(1) });
  }
  return out;
}

export const bodyMetrics: BodyMetric[] = buildBodyMetrics();
export const heightCm = 178;

const MOODS: JournalEntry["mood"][] = [3, 4, 4, 5, 4, 3, 5, 4];
const JOURNAL_SNIPPETS = [
  "Productive day. Shipped the dashboard shell and felt in flow.",
  "Bit tired but pushed through the workout. Proud of the streak.",
  "Spent more than planned on food. Noting it so next week is better.",
  "Great morning focus session. Energy dipped after lunch.",
  "Grateful for a calm evening. Read a chapter before bed.",
  "Rough start, but journaling helped me reset.",
];
function buildJournal(): JournalEntry[] {
  return eachDay(addDays(TODAY, -26), TODAY)
    .filter((_, i) => i % 1 === 0)
    .map((date, i) => {
      const r = mulberry32(seedFromIso(date) + 5);
      if (r() < 0.25 && date !== TODAY) return null;
      return {
        id: date,
        date,
        mood: MOODS[Math.floor(r() * MOODS.length)],
        body: JOURNAL_SNIPPETS[i % JOURNAL_SNIPPETS.length],
      };
    })
    .filter(Boolean) as JournalEntry[];
}

export const journal: JournalEntry[] = buildJournal();

export const todayTimeline: TimelineEvent[] = [
  { time: "09:00", section: "projects", title: "Project Deep Work", subtitle: "2h focused session" },
  { time: "10:30", section: "workout", title: "Workout", subtitle: "Strength training" },
  { time: "14:00", section: "expenses", title: "Expense Logged", subtitle: "৳450 · Lunch & coffee" },
  { time: "20:00", section: "mental", title: "Journal Reflection", subtitle: "Feeling optimistic" },
];

// ---- derived signals -----------------------------------------------------

export function computeSignals(): LifeSignals {
  const last7 = eachDay(addDays(TODAY, -6), TODAY);

  const ongoing = projects.filter((p) => p.status === "ongoing");
  const productivity =
    ongoing.reduce((a, p) => a + Math.min(100, (p.current / p.targetValue) * 100), 0) /
    Math.max(1, ongoing.length);

  const weekWorkouts = workoutLogs.filter((w) => last7.includes(w.date) && w.done).length;
  const fitness = Math.min(100, (weekWorkouts / 5) * 100);

  const weekSpend = expenses.filter((e) => last7.includes(e.date)).reduce((a, e) => a + e.amount, 0);
  const budget = 6000;
  const money = Math.round(Math.max(20, Math.min(100, (1 - (weekSpend - budget) / budget) * 100)));

  const recentMoods = journal.filter((j) => last7.includes(j.date));
  const avgMood = recentMoods.length ? recentMoods.reduce((a, j) => a + j.mood, 0) / recentMoods.length : 3.5;
  const mental = Math.round((avgMood / 5) * 100);

  const activeDays = last7.filter((d) => {
    const a = activity.find((x) => x.date === d);
    return a && Object.values(a.counts).some((c) => c > 0);
  }).length;
  const focus = Math.round((activeDays / 7) * 100);

  return {
    productivity: Math.round(productivity),
    fitness: Math.round(fitness),
    money,
    mental,
    focus,
    streakDays: profile.streakDays,
  };
}

export const signals = computeSignals();
export const score = lifeScore(signals);
export const scoreMeta = scoreLabel(score);
export const mood = moodState(signals, score);

/** Life Score trend — last 30 days, gently rising to the current score. */
export const lifeTrend = eachDay(addDays(TODAY, -29), TODAY).map((date, i) => {
  const r = mulberry32(seedFromIso(date) + 13);
  const ramp = 68 + (i / 29) * (score - 68);
  return { date, value: Math.round(Math.max(40, Math.min(100, ramp + (r() - 0.5) * 8))) };
});

/** Life Balance radar — you vs an ideal. */
export const lifeBalance = [
  { axis: "Productivity", you: signals.productivity, ideal: 90 },
  { axis: "Focus", you: signals.focus, ideal: 90 },
  { axis: "Fitness", you: signals.fitness, ideal: 90 },
  { axis: "Spending", you: signals.money, ideal: 90 },
  { axis: "Mental", you: signals.mental, ideal: 90 },
];

export const TODAY_ISO = TODAY;

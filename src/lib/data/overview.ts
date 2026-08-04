import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import {
  activeDayCount,
  buildActivity,
  bump,
  computeLifeTrend,
  computeSignals,
  computeStreak,
  progressionFromActiveDays,
  type SectionCounts,
} from "@/lib/aggregate";
import { lifeScore, moodState, scoreLabel } from "@/lib/life-score";
import { headline, rabbitSays, rabbitStateFor } from "@/lib/motivation";
import {
  HEATMAP_DAYS,
  WEEKLY_BUDGET,
  shapeBodyMetrics,
  shapeExpenses,
  shapeJournal,
  shapeProjects,
  shapeWorkoutLogs,
} from "@/lib/data/shared";
import type {
  BodyMetric,
  Expense,
  JournalEntry,
  Project,
  TimelineEvent,
  WorkoutLog,
  DayActivity,
} from "@/lib/types";

export interface OverviewData {
  isDemo: false;
  profile: { name: string; level: number; streakDays: number };
  budget: number;
  projects: Project[];
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetric[];
  expenses: Expense[];
  journal: JournalEntry[];
  activity: DayActivity[];
  signals: ReturnType<typeof computeSignals>;
  score: number;
  scoreMeta: ReturnType<typeof scoreLabel>;
  mood: ReturnType<typeof moodState>;
  lifeTrend: { date: string; value: number }[];
  lifeBalance: { axis: string; you: number; ideal: number }[];
  todayTimeline: TimelineEvent[];
  headline: string;
  insights: ReturnType<typeof rabbitSays>;
  rabbitState: ReturnType<typeof rabbitStateFor>;
  weekSpend: number;
}

export async function getOverviewData(today: string): Promise<OverviewData> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);

  const [
    { data: expRows },
    { data: projRows },
    { data: projLogs },
    { data: woRows },
    { data: bmRows },
    { data: jrnRows },
    { data: prof },
    { data: user },
  ] = await Promise.all([
    supabase.from("expenses").select("id,spent_at,amount,note,category_id").gte("spent_at", start).order("spent_at"),
    supabase.from("projects").select("*").order("status").order("created_at"),
    supabase.from("project_logs").select("log_date").gte("log_date", start),
    supabase.from("workout_logs").select("log_date,done,plan_label,note").gte("log_date", start).order("log_date"),
    supabase.from("body_metrics").select("log_date,weight_kg,body_fat_pct").order("log_date"),
    supabase.from("journal_entries").select("id,entry_date,mood,body").gte("entry_date", start).order("entry_date"),
    supabase.from("profiles").select("display_name").maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const expenses = shapeExpenses(expRows);
  const projects = shapeProjects(projRows);
  const workoutLogs = shapeWorkoutLogs(woRows);
  const bodyMetrics = shapeBodyMetrics(bmRows);
  const journal = shapeJournal(jrnRows);

  // combined activity across every section
  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const e of expenses) bump(byDate, e.date, "expenses");
  for (const l of projLogs ?? []) bump(byDate, String(l.log_date), "projects");
  for (const w of workoutLogs) if (w.done) bump(byDate, w.date, "workout");
  for (const j of journal) bump(byDate, j.date, "mental");
  const activity = buildActivity(start, today, byDate);

  const streakDays = computeStreak(activity, today);
  const base = { projects, workoutLogs, expenses, journal, activity, budget: WEEKLY_BUDGET };
  const signals = computeSignals({ ...base, today, streakDays });
  const score = lifeScore(signals);
  const scoreMeta = scoreLabel(score);
  const mood = moodState(signals, score);
  const lifeTrend = computeLifeTrend(base, today, 30);

  const meta = user?.user?.user_metadata ?? {};
  const name =
    prof?.display_name?.toString().split(" ")[0] ||
    (typeof meta.full_name === "string" ? meta.full_name.split(" ")[0] : "") ||
    (typeof meta.name === "string" ? meta.name.split(" ")[0] : "") ||
    "Rifat";

  const last7 = new Set(
    Array.from({ length: 7 }, (_, i) => addDays(today, -i)),
  );
  const weekSpend = expenses.filter((e) => last7.has(e.date)).reduce((a, e) => a + e.amount, 0);
  const deltaVsLastWeek = score - (lifeTrend[lifeTrend.length - 8]?.value ?? score);
  const todayActivity = activity.find((a) => a.date === today);

  return {
    isDemo: false,
    profile: { name, level: progressionFromActiveDays(activeDayCount(activity)).level, streakDays },
    budget: WEEKLY_BUDGET,
    projects,
    workoutLogs,
    bodyMetrics,
    expenses,
    journal,
    activity,
    signals,
    score,
    scoreMeta,
    mood,
    lifeTrend,
    lifeBalance: [
      { axis: "Productivity", you: signals.productivity, ideal: 90 },
      { axis: "Focus", you: signals.focus, ideal: 90 },
      { axis: "Fitness", you: signals.fitness, ideal: 90 },
      { axis: "Spending", you: signals.money, ideal: 90 },
      { axis: "Mental", you: signals.mental, ideal: 90 },
    ],
    todayTimeline: buildTodayTimeline(today, { expenses, workoutLogs, projects, journal }),
    headline: headline(signals, deltaVsLastWeek),
    insights: rabbitSays(signals, weekSpend, WEEKLY_BUDGET),
    rabbitState: rabbitStateFor(todayActivity, score),
    weekSpend,
  };
}

/**
 * The week's Mood State on its own — the same signal blend getOverviewData uses,
 * but trimmed to what feeds moodState(). Rendered app-wide so the ambient aura
 * (<html data-mood>) reflects real signals on every page, not just the overview.
 */
export async function getMoodState(today: string): Promise<ReturnType<typeof moodState>> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);

  const [{ data: expRows }, { data: projRows }, { data: projLogs }, { data: woRows }, { data: jrnRows }] =
    await Promise.all([
      supabase.from("expenses").select("id,spent_at,amount,note,category_id").gte("spent_at", start).order("spent_at"),
      supabase.from("projects").select("*").order("status").order("created_at"),
      supabase.from("project_logs").select("log_date").gte("log_date", start),
      supabase.from("workout_logs").select("log_date,done,plan_label,note").gte("log_date", start).order("log_date"),
      supabase.from("journal_entries").select("id,entry_date,mood,body").gte("entry_date", start).order("entry_date"),
    ]);

  const expenses = shapeExpenses(expRows);
  const projects = shapeProjects(projRows);
  const workoutLogs = shapeWorkoutLogs(woRows);
  const journal = shapeJournal(jrnRows);

  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const e of expenses) bump(byDate, e.date, "expenses");
  for (const l of projLogs ?? []) bump(byDate, String(l.log_date), "projects");
  for (const w of workoutLogs) if (w.done) bump(byDate, w.date, "workout");
  for (const j of journal) bump(byDate, j.date, "mental");
  const activity = buildActivity(start, today, byDate);

  const streakDays = computeStreak(activity, today);
  const signals = computeSignals({ projects, workoutLogs, expenses, journal, activity, budget: WEEKLY_BUDGET, today, streakDays });
  return moodState(signals, lifeScore(signals));
}

function buildTodayTimeline(
  today: string,
  d: { expenses: Expense[]; workoutLogs: WorkoutLog[]; projects: Project[]; journal: JournalEntry[] },
): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  const todaysExpenses = d.expenses.filter((e) => e.date === today);
  if (todaysExpenses.length) {
    const total = todaysExpenses.reduce((a, e) => a + e.amount, 0);
    out.push({ time: "—", section: "expenses", title: "Expenses logged", subtitle: `৳${total.toLocaleString("en-US")} · ${todaysExpenses.length} today` });
  }
  const wo = d.workoutLogs.find((w) => w.date === today && w.done);
  if (wo) out.push({ time: "—", section: "workout", title: "Workout done", subtitle: wo.planLabel || "Trained today" });
  const jr = d.journal.find((j) => j.date === today);
  if (jr) out.push({ time: "—", section: "mental", title: "Journal reflection", subtitle: `Mood ${jr.mood}/5` });
  if (!out.length) {
    out.push({ time: "—", section: "system", title: "Nothing logged yet", subtitle: "Tap + to add your first entry today" });
  }
  return out;
}

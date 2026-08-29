import { cache } from "react";
import { addDays, startOfWeek } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getLocaleContext } from "@/lib/session";
import type { LocaleContext } from "@/lib/locale";
import { money } from "@/lib/money";
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
import { headline, mascotSays, mascotStateFor } from "@/lib/motivation";
import { getTargets } from "@/lib/data/targets";
import { computeTargetStatuses, worstLevel, type TargetStatus } from "@/lib/targets";
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
  insights: ReturnType<typeof mascotSays>;
  mascotState: ReturnType<typeof mascotStateFor>;
  weekSpend: number;
  /** every target checked against reality — the Overview is the only full view */
  statuses: TargetStatus[];
}

interface SignalData {
  expenses: Expense[];
  projects: Project[];
  workoutLogs: WorkoutLog[];
  journal: JournalEntry[];
  activity: DayActivity[];
}

/**
 * The five core queries every signal-based computation needs. React.cache()
 * deduplicates within a request: the layout calls getMoodState(today) and the
 * overview page calls getOverviewData(today) — without this, every query ran
 * twice (~14 Supabase calls per overview render → ~8).
 */
const getSignalRows = cache(async (today: string): Promise<SignalData> => {
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

  return { expenses, projects, workoutLogs, journal, activity };
});

export async function getOverviewData(today: string): Promise<OverviewData> {
  const supabase = await createClient();

  const [{ expenses, projects, workoutLogs, journal, activity }, { data: bmRows }, { data: prof }, { data: user }] =
    await Promise.all([
      getSignalRows(today),
      supabase.from("body_metrics").select("log_date,weight_kg,body_fat_pct").order("log_date"),
      supabase.from("user_profiles").select("display_name").maybeSingle(),
      supabase.auth.getUser(),
    ]);

  const targets = await getTargets();
  const budget = targets.weeklyExpenseCap ?? WEEKLY_BUDGET;
  const locale = await getLocaleContext();

  const bodyMetrics = shapeBodyMetrics(bmRows);
  const streakDays = computeStreak(activity, today);
  const base = { projects, workoutLogs, expenses, journal, activity, budget };
  const signals = computeSignals({ ...base, today, streakDays });
  const score = lifeScore(signals);
  const scoreMeta = scoreLabel(score);
  const statuses = computeTargetStatuses({ today, targets, expenses, workoutLogs, journal, projects, ...locale });
  const worst = worstLevel(statuses);
  const mood = moodState(signals, score, worst);
  const lifeTrend = computeLifeTrend(base, today, 365);

  const meta = user?.user?.user_metadata ?? {};
  const name =
    prof?.display_name?.toString().split(" ")[0] ||
    (typeof meta.full_name === "string" ? meta.full_name.split(" ")[0] : "") ||
    (typeof meta.name === "string" ? meta.name.split(" ")[0] : "") ||
    user?.user?.email?.split("@")[0] ||
    "Friend";

  const weekStart = startOfWeek(today);
  const weekSpend = expenses.filter((e) => e.date >= weekStart && e.date <= today).reduce((a, e) => a + e.amount, 0);
  const deltaVsLastWeek = score - (lifeTrend[lifeTrend.length - 8]?.value ?? score);
  const todayActivity = activity.find((a) => a.date === today);

  return {
    isDemo: false,
    profile: { name, level: progressionFromActiveDays(activeDayCount(activity)).level, streakDays },
    budget,
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
    todayTimeline: buildTodayTimeline(today, { expenses, workoutLogs, projects, journal }, locale),
    headline: headline(signals, deltaVsLastWeek),
    insights: mascotSays(signals, weekSpend, budget, locale),
    mascotState: mascotStateFor(todayActivity, score, worst),
    weekSpend,
    statuses,
  };
}

/**
 * The week's Mood State — same signal blend as getOverviewData, but trimmed to
 * what feeds moodState(). Calls getSignalRows() which is React.cache()d, so on
 * the overview route the data is already warm from getOverviewData.
 */
export async function getMoodState(today: string): Promise<ReturnType<typeof moodState>> {
  const { expenses, projects, workoutLogs, journal, activity } = await getSignalRows(today);
  const streakDays = computeStreak(activity, today);
  const targets = await getTargets();
  const budget = targets.weeklyExpenseCap ?? WEEKLY_BUDGET;
  const signals = computeSignals({ projects, workoutLogs, expenses, journal, activity, budget, today, streakDays });
  const worst = worstLevel(
    computeTargetStatuses({ today, targets, expenses, workoutLogs, journal, projects, ...(await getLocaleContext()) }),
  );
  return moodState(signals, lifeScore(signals), worst);
}

function buildTodayTimeline(
  today: string,
  d: { expenses: Expense[]; workoutLogs: WorkoutLog[]; projects: Project[]; journal: JournalEntry[] },
  locale: LocaleContext,
): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  const todaysExpenses = d.expenses.filter((e) => e.date === today);
  if (todaysExpenses.length) {
    const total = todaysExpenses.reduce((a, e) => a + e.amount, 0);
    out.push({ time: "—", section: "expenses", title: "Expenses logged", subtitle: `${money(total, locale)} · ${todaysExpenses.length} today` });
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

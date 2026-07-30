/*
  Real read path. Each getter fetches the signed-in user's rows (RLS scopes
  everything to auth.uid()) and shapes them into the SAME domain types the
  sample-data preview uses — so the dashboard components render identically
  whether the data is seeded or real.

  Server-only: these use the cookie-bound Supabase server client and must only be
  imported from Server Components / Server Actions (never a "use client" module).
*/
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
import type {
  BodyMetric,
  DayActivity,
  Expense,
  ExpenseCategory,
  JournalEntry,
  Project,
  ProjectCommit,
  ProjectTask,
  TimelineEvent,
  WorkoutLog,
  WorkoutPlanDay,
} from "@/lib/types";

/** Weekly spending budget (৳). Static for v1; can move to profile settings later. */
export const WEEKLY_BUDGET = 6000;
const HEATMAP_DAYS = 364;

// ---- row → domain shapers -------------------------------------------------

function shapeCategories(rows: Record<string, unknown>[] | null): ExpenseCategory[] {
  return (rows ?? []).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    color: String(c.color ?? "var(--accent-cyan)"),
    icon: String(c.icon ?? "Sparkles"),
  }));
}

function shapeExpenses(rows: Record<string, unknown>[] | null): Expense[] {
  return (rows ?? []).map((e) => ({
    id: String(e.id),
    date: String(e.spent_at),
    amount: Number(e.amount),
    categoryId: e.category_id ? String(e.category_id) : "",
    note: e.note ? String(e.note) : undefined,
  }));
}

function shapeProjects(rows: Record<string, unknown>[] | null): Project[] {
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

function shapeTasks(rows: Record<string, unknown>[] | null): ProjectTask[] {
  return (rows ?? []).map((t) => ({ id: String(t.id), title: String(t.title), done: Boolean(t.done) }));
}

function shapeWorkoutLogs(rows: Record<string, unknown>[] | null): WorkoutLog[] {
  return (rows ?? []).map((w) => ({
    date: String(w.log_date),
    done: Boolean(w.done),
    planLabel: w.plan_label ? String(w.plan_label) : "",
    note: w.note ? String(w.note) : undefined,
  }));
}

function shapeBodyMetrics(rows: Record<string, unknown>[] | null): BodyMetric[] {
  return (rows ?? [])
    .filter((m) => m.weight_kg != null)
    .map((m) => ({
      date: String(m.log_date),
      weightKg: Number(m.weight_kg),
      bodyFatPct: m.body_fat_pct != null ? Number(m.body_fat_pct) : undefined,
    }));
}

function shapePlan(rows: Record<string, unknown>[] | null): WorkoutPlanDay[] {
  return (rows ?? [])
    .map((d) => ({ weekday: Number(d.weekday), label: String(d.label), focus: String(d.focus ?? "") }))
    .sort((a, b) => a.weekday - b.weekday);
}

function shapeJournal(rows: Record<string, unknown>[] | null): JournalEntry[] {
  return (rows ?? []).map((j) => ({
    id: String(j.id),
    date: String(j.entry_date),
    mood: Math.min(5, Math.max(1, Number(j.mood))) as JournalEntry["mood"],
    body: j.body ? String(j.body) : "",
  }));
}

// ---- per-section getters --------------------------------------------------

export async function getExpensesData(today: string): Promise<{
  categories: ExpenseCategory[];
  expenses: Expense[];
  activity: DayActivity[];
}> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);
  const [{ data: cats }, { data: rows }] = await Promise.all([
    supabase.from("expense_categories").select("id,name,color,icon").order("is_preset", { ascending: false }).order("name"),
    supabase.from("expenses").select("id,spent_at,amount,note,category_id").gte("spent_at", start).order("spent_at"),
  ]);

  const categories = shapeCategories(cats);
  const expenses = shapeExpenses(rows);
  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const e of expenses) bump(byDate, e.date, "expenses");
  return { categories, expenses, activity: buildActivity(start, today, byDate) };
}

export async function getProjectsData(today: string): Promise<{
  projects: Project[];
  activity: DayActivity[];
}> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);
  const [{ data: projRows }, { data: logs }, { data: taskRows }] = await Promise.all([
    supabase.from("projects").select("*").order("status").order("created_at"),
    supabase.from("project_logs").select("project_id,log_date").gte("log_date", start),
    supabase.from("project_tasks").select("id,project_id,title,done").order("position"),
  ]);

  const projects = shapeProjects(projRows);

  // Attach each project's checklist + how many distinct days it was worked on.
  const tasksByProject = new Map<string, ProjectTask[]>();
  for (const t of taskRows ?? []) {
    const pid = String(t.project_id);
    const list = tasksByProject.get(pid) ?? [];
    list.push({ id: String(t.id), title: String(t.title), done: Boolean(t.done) });
    tasksByProject.set(pid, list);
  }
  const daysByProject = new Map<string, Set<string>>();
  for (const l of logs ?? []) {
    const pid = String(l.project_id);
    const set = daysByProject.get(pid) ?? new Set<string>();
    set.add(String(l.log_date));
    daysByProject.set(pid, set);
  }
  for (const p of projects) {
    p.tasks = tasksByProject.get(p.id) ?? [];
    p.daysWorked = daysByProject.get(p.id)?.size ?? 0;
  }

  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const l of logs ?? []) bump(byDate, String(l.log_date), "projects");
  return { projects, activity: buildActivity(start, today, byDate) };
}

/** Full detail for one project: checklist, dated update-commits, and its own heatmap. */
export async function getProjectDetail(
  projectId: string,
  today: string,
): Promise<{ project: Project; activity: DayActivity[] } | null> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);
  const [{ data: projRow }, { data: taskRows }, { data: logRows }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    supabase.from("project_tasks").select("id,project_id,title,done").eq("project_id", projectId).order("position"),
    supabase
      .from("project_logs")
      .select("id,log_date,note")
      .eq("project_id", projectId)
      .order("log_date", { ascending: false }),
  ]);

  if (!projRow) return null;

  const [project] = shapeProjects([projRow]);
  project.tasks = shapeTasks(taskRows);
  project.commits = (logRows ?? [])
    .filter((l) => l.note)
    .map((l): ProjectCommit => ({ id: String(l.id), date: String(l.log_date), note: String(l.note) }));

  const days = new Set<string>();
  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const l of logRows ?? []) {
    const date = String(l.log_date);
    days.add(date);
    if (date >= start) bump(byDate, date, "projects");
  }
  project.daysWorked = days.size;

  return { project, activity: buildActivity(start, today, byDate) };
}

export async function getWorkoutData(today: string): Promise<{
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetric[];
  workoutPlan: WorkoutPlanDay[];
  heightCm: number | null;
  activity: DayActivity[];
}> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);
  const [{ data: logs }, { data: metrics }, { data: plan }, { data: prof }] = await Promise.all([
    supabase.from("workout_logs").select("log_date,done,plan_label,note").gte("log_date", start).order("log_date"),
    supabase.from("body_metrics").select("log_date,weight_kg,body_fat_pct").order("log_date"),
    supabase.from("workout_plan_days").select("weekday,label,focus"),
    supabase.from("profiles").select("height_cm").maybeSingle(),
  ]);

  const workoutLogs = shapeWorkoutLogs(logs);
  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const w of workoutLogs) if (w.done) bump(byDate, w.date, "workout");
  return {
    workoutLogs,
    bodyMetrics: shapeBodyMetrics(metrics),
    workoutPlan: shapePlan(plan),
    heightCm: prof?.height_cm != null ? Number(prof.height_cm) : null,
    activity: buildActivity(start, today, byDate),
  };
}

export async function getMentalData(today: string): Promise<{
  journal: JournalEntry[];
  activity: DayActivity[];
}> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);
  const { data: rows } = await supabase
    .from("journal_entries")
    .select("id,entry_date,mood,body")
    .gte("entry_date", start)
    .order("entry_date");

  const journal = shapeJournal(rows);
  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const j of journal) bump(byDate, j.date, "mental");
  return { journal, activity: buildActivity(start, today, byDate) };
}

// ---- overview (everything, combined) --------------------------------------

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

// ---- profile summary (name / email / Google avatar) -----------------------

export interface ProfileSummary {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  level: number;
  streakDays: number;
  xp: number;
  xpToNext: number;
}

export async function getProfileSummary(today: string): Promise<ProfileSummary> {
  const supabase = await createClient();
  const start = addDays(today, -60);

  const [{ data: userRes }, { data: prof }, { data: exp }, { data: wo }, { data: jr }, { data: pl }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("display_name").maybeSingle(),
      supabase.from("expenses").select("spent_at").gte("spent_at", start),
      supabase.from("workout_logs").select("log_date,done").gte("log_date", start),
      supabase.from("journal_entries").select("entry_date").gte("entry_date", start),
      supabase.from("project_logs").select("log_date").gte("log_date", start),
    ]);

  const user = userRes?.user;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (prof?.display_name as string | undefined) ||
    (typeof meta.full_name === "string" ? meta.full_name : "") ||
    (typeof meta.name === "string" ? meta.name : "") ||
    "Rifat";
  const name = fullName.split(" ")[0] || "Rifat";
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const e of exp ?? []) bump(byDate, String(e.spent_at), "expenses");
  for (const w of wo ?? []) if (w.done) bump(byDate, String(w.log_date), "workout");
  for (const j of jr ?? []) bump(byDate, String(j.entry_date), "mental");
  for (const p of pl ?? []) bump(byDate, String(p.log_date), "projects");
  const activity = buildActivity(start, today, byDate);

  const streakDays = computeStreak(activity, today);
  const prog = progressionFromActiveDays(activeDayCount(activity));
  return { name, email: user?.email ?? null, avatarUrl, level: prog.level, streakDays, xp: prog.xp, xpToNext: prog.xpToNext };
}

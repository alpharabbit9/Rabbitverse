"use client";

import { addDays, eachDay, shortDate, startOfMonth, startOfWeek } from "@/lib/dates";
import type { LifeSignals } from "@/lib/life-score";
import type { scoreLabel } from "@/lib/life-score";
import type { Insight, mascotStateFor } from "@/lib/motivation";
import type {
  BodyMetric,
  DayActivity,
  Expense,
  JournalEntry,
  MoodState,
  Project,
  SectionKey,
  TimelineEvent,
  WorkoutLog,
} from "@/lib/types";
import { SECTION_META } from "@/lib/nav";
import { attentionStatuses, sectionStatuses, type TargetStatus } from "@/lib/targets";
import { RangeToggle, useRange } from "@/components/ui/range-toggle";
import { sliceTail } from "@/lib/range";
import { TargetBadge, TargetWarnings } from "@/components/dashboard/target-warning";
import { useMoney } from "@/components/locale-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AIInsight } from "@/components/dashboard/ai-insight";
import { MascotSays } from "@/components/dashboard/mascot-says";
import { TrendChart } from "@/components/charts/trend-chart";
import { RadarBalance } from "@/components/charts/radar-balance";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { TodayTimeline } from "@/components/dashboard/today-timeline";
import { SectionCard } from "@/components/dashboard/section-card";
import { Panel } from "@/components/dashboard/panel";
import { Ring } from "@/components/ui/ring";
import { CountUp } from "@/components/ui/count-up";

export interface OverviewViewProps {
  today: string;
  isDemo: boolean;
  budget: number;
  profile: { name: string; level: number; streakDays: number };
  projects: Project[];
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetric[];
  expenses: Expense[];
  journal: JournalEntry[];
  activity: DayActivity[];
  signals: LifeSignals;
  score: number;
  scoreMeta: ReturnType<typeof scoreLabel>;
  mood: MoodState;
  lifeTrend: { date: string; value: number }[];
  lifeBalance: { axis: string; you: number; ideal: number }[];
  todayTimeline: TimelineEvent[];
  headline: string;
  insights: Insight[];
  mascotState: ReturnType<typeof mascotStateFor>;
  /** every target checked against reality; the strip below shows the non-ok ones */
  statuses?: TargetStatus[];
}

export function OverviewView(p: OverviewViewProps) {
  const money = useMoney();
  const [range, setRange] = useRange();
  const { today } = p;
  const statuses = p.statuses ?? [];
  const attention = attentionStatuses(statuses);
  /** worst level for one section, so a section card can wear a pill. */
  const badgeFor = (section: SectionKey) => {
    const worst = sectionStatuses(statuses, section).find((s) => s.level !== "ok");
    return worst ? <TargetBadge level={worst.level} label={worst.level === "over" ? "Off track" : "Heads up"} /> : null;
  };
  const last7 = eachDay(addDays(today, -6), today); // trailing shape, for sparklines only

  const ongoing = p.projects.filter((x) => x.status === "ongoing");
  const completed = p.projects.filter((x) => x.status === "completed");
  const overallProgress = Math.round(
    ongoing.reduce((a, x) => a + Math.min(100, (x.current / Math.max(1, x.targetValue)) * 100), 0) / Math.max(1, ongoing.length),
  );

  const weekWorkouts = p.workoutLogs.filter((w) => w.done && w.date >= startOfWeek(today) && w.date <= today).length;
  const latestWeight = p.bodyMetrics[p.bodyMetrics.length - 1]?.weightKg ?? 0;

  // Weekly/monthly spend use the real Dhaka week and calendar month, matching
  // the target warnings above — a rolling window here would contradict them.
  const spendBetween = (from: string, to: string) =>
    p.expenses.filter((e) => e.date >= from && e.date <= to).reduce((a, e) => a + e.amount, 0);
  const spendToday = spendBetween(today, today);
  const spendWeek = spendBetween(startOfWeek(today), today);
  const spendMonth = spendBetween(startOfMonth(today), today);
  // The Expenses card's tone comes from the user's own weekly cap when they set
  // one, so the card and the "needs attention" strip always tell one story.
  const weekStatus = statuses.find((s) => s.id === "expenses-week");
  const expenseTone = weekStatus
    ? { label: { ok: "Under your cap", warn: "Close to your cap", over: "Over your cap" }[weekStatus.level], color: { ok: "var(--accent-mint)", warn: "var(--accent-orange)", over: "var(--accent-rose)" }[weekStatus.level] }
    : { label: spendWeek <= p.budget ? "Under budget" : "Over budget", color: spendWeek <= p.budget ? "var(--accent-mint)" : "var(--accent-orange)" };

  const latestMood = p.journal.find((j) => j.date === today)?.mood ?? p.journal[p.journal.length - 1]?.mood ?? 4;

  const spark = (section: SectionKey) => p.activity.slice(-21).map((a) => a.counts[section]);
  const expenseSpark = last7.map((d) => p.expenses.filter((e) => e.date === d).reduce((a, e) => a + e.amount, 0));

  const trendData = sliceTail(p.lifeTrend, range).map((pt) => ({ label: shortDate(pt.date), value: pt.value }));
  const deltaVsLastWeek = p.score - (p.lifeTrend[p.lifeTrend.length - 8]?.value ?? p.score);

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        name={p.profile.name}
        subtitle={p.headline}
        streakDays={p.profile.streakDays}
        level={p.profile.level}
        mood={p.mood}
        mascotState={p.mascotState}
      />

      {attention.length > 0 && (
        <section aria-label="Targets needing attention" className="space-y-2">
          <h2 className="text-sm font-semibold text-fg-secondary">
            Needs attention · {attention.length}
          </h2>
          <TargetWarnings statuses={statuses} limit={3} />
        </section>
      )}

      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          index={0}
          icon="Activity"
          label="Life Score"
          accent="var(--accent-mint)"
          value={<CountUp value={p.score} />}
          toneLabel={p.scoreMeta.label}
          toneColor={p.scoreMeta.tone}
          delta={deltaVsLastWeek >= 0 ? { dir: "up", text: `${Math.abs(deltaVsLastWeek)}`, good: true } : { dir: "down", text: `${Math.abs(deltaVsLastWeek)}`, good: false }}
          spark={{ data: p.lifeTrend.slice(-12).map((pt) => pt.value), color: "var(--accent-mint)" }}
        />
        <StatCard
          index={1}
          icon="FolderKanban"
          label="Projects"
          accent="var(--accent-blue)"
          value={`${ongoing.length}/${p.projects.length}`}
          toneLabel="Focused"
          toneColor="var(--accent-blue)"
          progress={overallProgress}
        />
        <StatCard
          index={2}
          icon="Dumbbell"
          label="Workout"
          accent="var(--accent-purple)"
          value={<CountUp value={weekWorkouts} suffix="x" />}
          toneLabel="This week"
          toneColor="var(--accent-purple)"
          spark={{ data: spark("workout"), color: "var(--accent-purple)" }}
        />
        <StatCard
          index={3}
          icon="Wallet"
          label="Expenses"
          accent="var(--accent-mint)"
          value={money(spendWeek)}
          toneLabel={expenseTone.label}
          toneColor={expenseTone.color}
          spark={{ data: expenseSpark, color: "var(--accent-mint)" }}
        />
      </div>

      {/* AI insight + rabbit says */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <AIInsight />
        <MascotSays insights={p.insights} />
      </div>

      {/* trend + balance */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Panel title="Life Score Trend" className="lg:col-span-2" action={<RangeToggle value={range} onChange={setRange} />}>
          <TrendChart data={trendData} color="var(--accent-mint)" height={240} domain={[0, 100]} />
        </Panel>
        <Panel title="Life Balance" subtitle="You vs ideal">
          <RadarBalance data={p.lifeBalance} height={240} />
        </Panel>
      </div>

      {/* heatmap + timeline */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Panel title="Daily Activity" className="lg:col-span-2" subtitle="Every green day is a day you showed up">
          <ActivityHeatmap activity={p.activity} today={today} />
        </Panel>
        <Panel title="Today's Timeline">
          <TodayTimeline events={p.todayTimeline} />
        </Panel>
      </div>

      {/* life score ring highlight + section cards */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-4">
        <div className="glass flex min-w-0 items-center gap-4 rounded-2xl p-5">
          <Ring value={p.score} size={104} stroke={9}>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums">{p.score}</div>
              <div className="text-[10px] font-medium" style={{ color: p.scoreMeta.tone }}>
                {p.scoreMeta.label}
              </div>
            </div>
          </Ring>
          <div>
            <div className="text-sm font-medium text-fg-secondary">Overall Life Score</div>
            <p className="mt-1 text-xs text-fg-muted">A blend of your focus, fitness, money, and mind this week.</p>
          </div>
        </div>

        <SectionCard href="/projects" icon={SECTION_META.projects.icon} label="Projects" accent={SECTION_META.projects.accent} primary={`${ongoing.length} active`} sub={`${completed.length} completed · ${overallProgress}% overall`} spark={spark("projects")} badge={badgeFor("projects")} />
        <SectionCard href="/workout" icon={SECTION_META.workout.icon} label="Workout" accent={SECTION_META.workout.accent} primary={`${weekWorkouts} workout${weekWorkouts === 1 ? "" : "s"}`} sub={latestWeight ? `${latestWeight}kg · keep going` : "log your first"} spark={spark("workout")} badge={badgeFor("workout")} />
        <SectionCard href="/mental-health" icon={SECTION_META.mental.icon} label="Mental Health" accent={SECTION_META.mental.accent} primary={`Mood ${latestMood}/5`} sub={`${p.journal.length} journal entr${p.journal.length === 1 ? "y" : "ies"}`} spark={spark("mental")} badge={badgeFor("mental")} />
      </div>

      <p className="pt-2 text-center text-xs text-fg-muted">
        {p.isDemo
          ? `Showing sample data · connect Supabase to track your real life · today spent ${money(spendToday)} · month ${money(spendMonth)}`
          : `Your real data · today spent ${money(spendToday)} · month ${money(spendMonth)}`}
      </p>
    </div>
  );
}

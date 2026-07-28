"use client";

import { addDays, eachDay, weekdayShort } from "@/lib/dates";
import type { LifeSignals } from "@/lib/life-score";
import type { scoreLabel } from "@/lib/life-score";
import type { Insight, rabbitStateFor } from "@/lib/motivation";
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
import { taka } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AIInsight } from "@/components/dashboard/ai-insight";
import { RabbitSays } from "@/components/dashboard/rabbit-says";
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
  rabbitState: ReturnType<typeof rabbitStateFor>;
}

export function OverviewView(p: OverviewViewProps) {
  const { today } = p;
  const last7 = eachDay(addDays(today, -6), today);
  const last30 = eachDay(addDays(today, -29), today);

  const ongoing = p.projects.filter((x) => x.status === "ongoing");
  const completed = p.projects.filter((x) => x.status === "completed");
  const overallProgress = Math.round(
    ongoing.reduce((a, x) => a + Math.min(100, (x.current / Math.max(1, x.targetValue)) * 100), 0) / Math.max(1, ongoing.length),
  );

  const weekWorkouts = p.workoutLogs.filter((w) => last7.includes(w.date) && w.done).length;
  const latestWeight = p.bodyMetrics[p.bodyMetrics.length - 1]?.weightKg ?? 0;

  const spendToday = p.expenses.filter((e) => e.date === today).reduce((a, e) => a + e.amount, 0);
  const spendWeek = p.expenses.filter((e) => last7.includes(e.date)).reduce((a, e) => a + e.amount, 0);
  const spendMonth = p.expenses.filter((e) => last30.includes(e.date)).reduce((a, e) => a + e.amount, 0);

  const latestMood = p.journal.find((j) => j.date === today)?.mood ?? p.journal[p.journal.length - 1]?.mood ?? 4;

  const spark = (section: SectionKey) => p.activity.slice(-21).map((a) => a.counts[section]);
  const expenseSpark = last7.map((d) => p.expenses.filter((e) => e.date === d).reduce((a, e) => a + e.amount, 0));

  const trendData = p.lifeTrend.slice(-7).map((pt) => ({ label: weekdayShort(pt.date), value: pt.value }));
  const deltaVsLastWeek = p.score - (p.lifeTrend[p.lifeTrend.length - 8]?.value ?? p.score);

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        name={p.profile.name}
        subtitle={p.headline}
        streakDays={p.profile.streakDays}
        level={p.profile.level}
        mood={p.mood}
        rabbitState={p.rabbitState}
      />

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
          value={taka(spendWeek)}
          toneLabel={spendWeek <= p.budget ? "Under budget" : "Over budget"}
          toneColor={spendWeek <= p.budget ? "var(--accent-mint)" : "var(--accent-orange)"}
          spark={{ data: expenseSpark, color: "var(--accent-mint)" }}
        />
      </div>

      {/* AI insight + rabbit says */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <AIInsight />
        <RabbitSays insights={p.insights} />
      </div>

      {/* trend + balance */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Panel title="Life Score Trend" className="lg:col-span-2" action="This week">
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

        <SectionCard href="/projects" icon={SECTION_META.projects.icon} label="Projects" accent={SECTION_META.projects.accent} primary={`${ongoing.length} active`} sub={`${completed.length} completed · ${overallProgress}% overall`} spark={spark("projects")} />
        <SectionCard href="/workout" icon={SECTION_META.workout.icon} label="Workout" accent={SECTION_META.workout.accent} primary={`${weekWorkouts} workouts`} sub={latestWeight ? `${latestWeight}kg · keep going` : "log your first"} spark={spark("workout")} />
        <SectionCard href="/mental-health" icon={SECTION_META.mental.icon} label="Mental Health" accent={SECTION_META.mental.accent} primary={`Mood ${latestMood}/5`} sub={`${p.journal.length} journal entries`} spark={spark("mental")} />
      </div>

      <p className="pt-2 text-center text-xs text-fg-muted">
        {p.isDemo
          ? `Showing sample data · connect Supabase to track your real life · today spent ${taka(spendToday)} · month ${taka(spendMonth)}`
          : `Your real data · today spent ${taka(spendToday)} · month ${taka(spendMonth)}`}
      </p>
    </div>
  );
}

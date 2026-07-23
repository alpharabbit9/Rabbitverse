"use client";

import { addDays, eachDay, weekdayShort } from "@/lib/dates";
import {
  activity,
  bodyMetrics,
  expenses,
  journal,
  lifeBalance,
  lifeTrend,
  mood,
  profile,
  projects,
  score,
  scoreMeta,
  signals,
  todayTimeline,
  TODAY_ISO,
  workoutLogs,
} from "@/lib/sample-data";
import { headline, rabbitSays, rabbitStateFor } from "@/lib/motivation";
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

export default function OverviewPage() {
  const last7 = eachDay(addDays(TODAY_ISO, -6), TODAY_ISO);
  const last30 = eachDay(addDays(TODAY_ISO, -29), TODAY_ISO);

  // ---- aggregates -------------------------------------------------------
  const ongoing = projects.filter((p) => p.status === "ongoing");
  const completed = projects.filter((p) => p.status === "completed");
  const overallProgress = Math.round(
    ongoing.reduce((a, p) => a + Math.min(100, (p.current / p.targetValue) * 100), 0) / Math.max(1, ongoing.length),
  );

  const weekWorkouts = workoutLogs.filter((w) => last7.includes(w.date) && w.done).length;
  const latestWeight = bodyMetrics[bodyMetrics.length - 1]?.weightKg ?? 0;

  const spendToday = expenses.filter((e) => e.date === TODAY_ISO).reduce((a, e) => a + e.amount, 0);
  const spendWeek = expenses.filter((e) => last7.includes(e.date)).reduce((a, e) => a + e.amount, 0);
  const spendMonth = expenses.filter((e) => last30.includes(e.date)).reduce((a, e) => a + e.amount, 0);

  const latestMood = journal.find((j) => j.date === TODAY_ISO)?.mood ?? journal[journal.length - 1]?.mood ?? 4;

  const spark = (section: keyof (typeof activity)[number]["counts"]) =>
    activity.slice(-21).map((a) => a.counts[section]);
  const expenseSpark = last7.map((d) => expenses.filter((e) => e.date === d).reduce((a, e) => a + e.amount, 0));

  const trendData = lifeTrend.slice(-7).map((p) => ({ label: weekdayShort(p.date), value: p.value }));
  const deltaVsLastWeek = score - (lifeTrend[lifeTrend.length - 8]?.value ?? score);
  const todayActivity = activity.find((a) => a.date === TODAY_ISO);
  const rabbitState = rabbitStateFor(todayActivity, score);
  const insights = rabbitSays(signals, spendWeek, 6000);

  return (
    <div className="space-y-6">
      <PageHeader
        name={profile.name}
        subtitle={headline(signals, deltaVsLastWeek)}
        streakDays={profile.streakDays}
        level={profile.level}
        mood={mood}
        rabbitState={rabbitState}
      />

      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          index={0}
          icon="Activity"
          label="Life Score"
          accent="var(--accent-mint)"
          value={<CountUp value={score} />}
          toneLabel={scoreMeta.label}
          toneColor={scoreMeta.tone}
          delta={deltaVsLastWeek >= 0 ? { dir: "up", text: `${Math.abs(deltaVsLastWeek)}`, good: true } : { dir: "down", text: `${Math.abs(deltaVsLastWeek)}`, good: false }}
          spark={{ data: lifeTrend.slice(-12).map((p) => p.value), color: "var(--accent-mint)" }}
        />
        <StatCard
          index={1}
          icon="FolderKanban"
          label="Projects"
          accent="var(--accent-blue)"
          value={`${ongoing.length}/${projects.length}`}
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
          toneLabel={spendWeek <= 6000 ? "Under budget" : "Over budget"}
          toneColor={spendWeek <= 6000 ? "var(--accent-mint)" : "var(--accent-orange)"}
          spark={{ data: expenseSpark, color: "var(--accent-mint)" }}
        />
      </div>

      {/* AI insight + rabbit says */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AIInsight />
        <RabbitSays insights={insights} />
      </div>

      {/* trend + balance */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Life Score Trend" className="lg:col-span-2" action="This week">
          <TrendChart data={trendData} color="var(--accent-mint)" height={240} domain={[0, 100]} />
        </Panel>
        <Panel title="Life Balance" subtitle="You vs ideal">
          <RadarBalance data={lifeBalance} height={240} />
        </Panel>
      </div>

      {/* heatmap + timeline */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Daily Activity" className="lg:col-span-2" subtitle="Every green day is a day you showed up">
          <ActivityHeatmap activity={activity} today={TODAY_ISO} />
        </Panel>
        <Panel title="Today's Timeline">
          <TodayTimeline events={todayTimeline} />
        </Panel>
      </div>

      {/* life score ring highlight + section cards */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="glass flex items-center gap-4 rounded-2xl p-5">
          <Ring value={score} size={104} stroke={9}>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums">{score}</div>
              <div className="text-[10px] font-medium" style={{ color: scoreMeta.tone }}>
                {scoreMeta.label}
              </div>
            </div>
          </Ring>
          <div>
            <div className="text-sm font-medium text-fg-secondary">Overall Life Score</div>
            <p className="mt-1 text-xs text-fg-muted">A blend of your focus, fitness, money, and mind this week.</p>
          </div>
        </div>

        <SectionCard href="/projects" icon={SECTION_META.projects.icon} label="Projects" accent={SECTION_META.projects.accent} primary={`${ongoing.length} active`} sub={`${completed.length} completed · ${overallProgress}% overall`} spark={spark("projects")} />
        <SectionCard href="/workout" icon={SECTION_META.workout.icon} label="Workout" accent={SECTION_META.workout.accent} primary={`${weekWorkouts} workouts`} sub={`${latestWeight}kg · streak strong`} spark={spark("workout")} />
        <SectionCard href="/mental-health" icon={SECTION_META.mental.icon} label="Mental Health" accent={SECTION_META.mental.accent} primary={`Mood ${latestMood}/5`} sub={`${journal.length} journal entries`} spark={spark("mental")} />
      </div>

      <p className="pt-2 text-center text-xs text-fg-muted">
        Showing sample data · connect Supabase to track your real life · today spent {taka(spendToday)} · month {taka(spendMonth)}
      </p>
    </div>
  );
}

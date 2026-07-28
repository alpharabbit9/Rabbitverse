"use client";

import { addDays, eachDay, shortDate, weekdayMon0 } from "@/lib/dates";
import type { BodyMetric, DayActivity, WorkoutLog, WorkoutPlanDay } from "@/lib/types";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { TrendChart } from "@/components/charts/trend-chart";
import { TodayWorkoutForm, WeightForm } from "./workout-forms";

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WorkoutView({
  workoutLogs,
  bodyMetrics,
  workoutPlan,
  heightCm,
  activity,
  today,
  canLog = false,
}: {
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetric[];
  workoutPlan: WorkoutPlanDay[];
  heightCm: number | null;
  activity: DayActivity[];
  today: string;
  canLog?: boolean;
}) {
  const last7 = eachDay(addDays(today, -6), today);
  const weekWorkouts = workoutLogs.filter((w) => last7.includes(w.date) && w.done).length;
  const latest = bodyMetrics[bodyMetrics.length - 1];
  const bmi = latest && heightCm ? +(latest.weightKg / (heightCm / 100) ** 2).toFixed(1) : null;
  const weightTrend = bodyMetrics.map((m) => ({ label: shortDate(m.date), value: m.weightKg }));

  const todayLog = workoutLogs.find((w) => w.date === today);
  const todayStatus: "done" | "rest" | null = todayLog ? (todayLog.done ? "done" : "rest") : null;
  const todayPlan = workoutPlan.find((d) => d.weekday === weekdayMon0(today));

  return (
    <div className="space-y-6 sm:space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Workout</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {weekWorkouts} workouts this week{bmi ? ` · BMI ${bmi}` : ""}
        </p>
      </header>

      {canLog && (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          <Panel title="Today's session" subtitle={todayPlan ? `${todayPlan.label} · ${todayPlan.focus}` : "Log your training"}>
            <TodayWorkoutForm planLabel={todayPlan?.label ?? "workout"} status={todayStatus} />
          </Panel>
          <Panel title="Body weight" subtitle="Track your trend over time">
            <WeightForm latestWeight={latest?.weightKg} />
          </Panel>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <div className="glass rounded-2xl p-5">
          <div className="text-sm text-fg-secondary">This week</div>
          <div className="mt-1 text-3xl font-bold">{weekWorkouts}×</div>
          <div className="text-xs text-accent-purple">{weekWorkouts >= 3 ? "Consistency strong" : "Keep it going"}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-sm text-fg-secondary">Weight</div>
          <div className="mt-1 text-3xl font-bold">{latest ? `${latest.weightKg}kg` : "—"}</div>
          <div className="text-xs text-fg-muted">{latest?.bodyFatPct ? `Body fat ${latest.bodyFatPct}%` : "Log to track"}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-sm text-fg-secondary">BMI</div>
          <div className="mt-1 text-3xl font-bold">{bmi ?? "—"}</div>
          <div className="text-xs text-accent-mint">{bmi ? "Healthy range" : "Add weight & height"}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Panel title="Weight Trend" className="lg:col-span-2">
          {weightTrend.length ? (
            <TrendChart data={weightTrend} color="var(--accent-purple)" height={220} suffix="kg" />
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-fg-muted">
              <span className="max-w-[200px]">Log your weight to see the trend build.</span>
            </div>
          )}
        </Panel>
        <Panel title="7-Day Plan">
          <ul className="space-y-2">
            {workoutPlan.map((d) => (
              <li key={d.weekday} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <span className="font-medium">{WD[d.weekday]}</span>
                <span className="text-fg-secondary">{d.label}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Workout Activity" subtitle="Every day you trained">
        <ActivityHeatmap activity={activity} section="workout" today={today} />
      </Panel>
    </div>
  );
}

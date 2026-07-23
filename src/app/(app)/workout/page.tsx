"use client";

import { addDays, eachDay } from "@/lib/dates";
import { activity, bodyMetrics, heightCm, TODAY_ISO, workoutLogs, workoutPlan } from "@/lib/sample-data";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { TrendChart } from "@/components/charts/trend-chart";
import { shortDate } from "@/lib/dates";

export default function WorkoutPage() {
  const last7 = eachDay(addDays(TODAY_ISO, -6), TODAY_ISO);
  const weekWorkouts = workoutLogs.filter((w) => last7.includes(w.date) && w.done).length;
  const latest = bodyMetrics[bodyMetrics.length - 1];
  const bmi = latest ? +(latest.weightKg / (heightCm / 100) ** 2).toFixed(1) : 0;
  const weightTrend = bodyMetrics.map((m) => ({ label: shortDate(m.date), value: m.weightKg }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Workout</h1>
        <p className="mt-1 text-sm text-fg-secondary">{weekWorkouts} workouts this week · BMI {bmi}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <div className="text-sm text-fg-secondary">This week</div>
          <div className="mt-1 text-3xl font-bold">{weekWorkouts}×</div>
          <div className="text-xs text-accent-purple">Consistency strong</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-sm text-fg-secondary">Weight</div>
          <div className="mt-1 text-3xl font-bold">{latest?.weightKg}kg</div>
          <div className="text-xs text-fg-muted">Body fat {latest?.bodyFatPct}%</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-sm text-fg-secondary">BMI</div>
          <div className="mt-1 text-3xl font-bold">{bmi}</div>
          <div className="text-xs text-accent-mint">Healthy range</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Weight Trend" className="lg:col-span-2">
          <TrendChart data={weightTrend} color="var(--accent-purple)" height={220} suffix="kg" />
        </Panel>
        <Panel title="7-Day Plan">
          <ul className="space-y-2">
            {workoutPlan.map((d) => (
              <li key={d.weekday} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <span className="font-medium">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.weekday]}</span>
                <span className="text-fg-secondary">{d.label}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Workout Activity" subtitle="Every day you trained">
        <ActivityHeatmap activity={activity} section="workout" today={TODAY_ISO} />
      </Panel>
    </div>
  );
}

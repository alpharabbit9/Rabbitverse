"use client";

import { WEEKDAYS, shortDate, startOfWeek, weekdayMon0 } from "@/lib/dates";
import type { BodyMetric, DayActivity, WorkoutLog, WorkoutPlanDay } from "@/lib/types";
import type { TargetStatus } from "@/lib/targets";
import { bmiFrom } from "@/lib/health";
import { LOOK, TargetWarnings } from "@/components/dashboard/target-warning";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { TrendChart } from "@/components/charts/trend-chart";
import { HeightForm, TodayWorkoutForm, WeightForm } from "./workout-forms";
import { PlanEditor } from "./plan-editor";
import { RangeToggle, useRange } from "@/components/ui/range-toggle";
import { sliceRange } from "@/lib/range";

export function WorkoutView({
  workoutLogs,
  bodyMetrics,
  workoutPlan,
  heightCm,
  activity,
  today,
  statuses = [],
  canLog = false,
}: {
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetric[];
  workoutPlan: WorkoutPlanDay[];
  heightCm: number | null;
  activity: DayActivity[];
  today: string;
  statuses?: TargetStatus[];
  canLog?: boolean;
}) {
  // "This week" is the Dhaka Mon-start week — the same window the weekly
  // workout target is judged on, so the header can't disagree with the banner.
  const weekStart = startOfWeek(today);
  const weekWorkouts = workoutLogs.filter((w) => w.done && w.date >= weekStart && w.date <= today).length;
  const [range, setRange] = useRange();
  const latest = bodyMetrics[bodyMetrics.length - 1];
  const bmi = bmiFrom(latest?.weightKg, heightCm);
  const weightTrend = sliceRange(bodyMetrics, today, range).map((m) => ({ label: shortDate(m.date), value: m.weightKg }));

  // The week's verdict comes from the target engine itself rather than a second
  // hardcoded threshold — a local `>= 3` rule used to print "Consistency strong"
  // directly under a banner saying you were behind pace on a target of 5.
  const paceStatus = statuses.find((s) => s.id === "workout-week");

  const todayLog = workoutLogs.find((w) => w.date === today);
  const todayStatus: "done" | "rest" | null = todayLog ? (todayLog.done ? "done" : "rest") : null;
  const todayPlan = workoutPlan.find((d) => d.weekday === weekdayMon0(today));

  return (
    <div className="space-y-6 sm:space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Workout</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {weekWorkouts} workout{weekWorkouts === 1 ? "" : "s"} this week{bmi ? ` · BMI ${bmi.value}` : ""}
        </p>
      </header>

      <TargetWarnings statuses={statuses} />

      {canLog && (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          <Panel title="Today's session" subtitle={todayPlan ? `${todayPlan.label} · ${todayPlan.focus}` : "Log your training"}>
            <TodayWorkoutForm planLabel={todayPlan?.label ?? "workout"} status={todayStatus} />
          </Panel>
          <Panel title="Body stats" subtitle="Weight logs daily · height sets your BMI">
            <div className="space-y-4">
              <WeightForm latestWeight={latest?.weightKg} />
              <div className="border-t border-border pt-4">
                <HeightForm heightCm={heightCm} />
              </div>
            </div>
          </Panel>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <div className="glass rounded-2xl p-5">
          <div className="text-sm text-fg-secondary">This week</div>
          <div className="mt-1 text-3xl font-bold">{weekWorkouts}×</div>
          {paceStatus ? (
            <div className="text-xs" style={{ color: LOOK[paceStatus.level].accent }}>
              {paceStatus.label}
            </div>
          ) : (
            <div className="text-xs text-fg-muted">{weekWorkouts ? "Logged and moving" : "No target set"}</div>
          )}
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-sm text-fg-secondary">Weight</div>
          <div className="mt-1 text-3xl font-bold">{latest ? `${latest.weightKg}kg` : "—"}</div>
          <div className="text-xs text-fg-muted">{latest?.bodyFatPct ? `Body fat ${latest.bodyFatPct}%` : "Log to track"}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-sm text-fg-secondary">BMI</div>
          <div className="mt-1 text-3xl font-bold">{bmi?.value ?? "—"}</div>
          {bmi ? (
            <div className="text-xs" style={{ color: bmi.accent }}>
              {bmi.label}
            </div>
          ) : (
            <div className="text-xs text-fg-muted">Add weight & height</div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Panel title="Weight Trend" className="lg:col-span-2" action={<RangeToggle value={range} onChange={setRange} />}>
          {weightTrend.length ? (
            <TrendChart data={weightTrend} color="var(--accent-purple)" height={220} suffix="kg" />
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-fg-muted">
              <span className="max-w-[200px]">Log your weight to see the trend build.</span>
            </div>
          )}
        </Panel>
        <Panel title="7-Day Plan" subtitle={canLog ? "Tap a day to rename it" : undefined}>
          {canLog ? (
            <PlanEditor plan={workoutPlan} todayWeekday={weekdayMon0(today)} />
          ) : (
            <ul className="space-y-2">
              {workoutPlan.map((d) => (
                <li key={d.weekday} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <span className="font-medium">{WEEKDAYS[d.weekday]}</span>
                  <span className="text-fg-secondary">{d.label}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Workout Activity" subtitle="Every day you trained">
        <ActivityHeatmap activity={activity} section="workout" today={today} />
      </Panel>
    </div>
  );
}

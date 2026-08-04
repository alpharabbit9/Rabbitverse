import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { buildActivity, bump, type SectionCounts } from "@/lib/aggregate";
import { HEATMAP_DAYS, shapeBodyMetrics, shapePlan, shapeWorkoutLogs } from "@/lib/data/shared";
import type { BodyMetric, DayActivity, WorkoutLog, WorkoutPlanDay } from "@/lib/types";

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

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getWorkoutData } from "@/lib/data/workout";
import { getTargets } from "@/lib/data/targets";
import { DEFAULT_TARGETS, sectionTargetStatuses } from "@/lib/targets";
import { activity as sampleActivity, bodyMetrics as sampleMetrics, heightCm as sampleHeight, workoutLogs as sampleLogs, workoutPlan as samplePlan } from "@/lib/sample-data";
import { WorkoutView } from "./workout-view";
import { currentDay } from "@/lib/session";

export default async function WorkoutPage() {
  const today = await currentDay();

  if (!isSupabaseConfigured) {
    return (
      <WorkoutView
        statuses={sectionTargetStatuses("workout", { today, targets: DEFAULT_TARGETS, workoutLogs: sampleLogs })}
        workoutLogs={sampleLogs}
        bodyMetrics={sampleMetrics}
        workoutPlan={samplePlan}
        heightCm={sampleHeight}
        activity={sampleActivity}
        today={today}
      />
    );
  }

  const [{ workoutLogs, bodyMetrics, workoutPlan, heightCm, activity }, targets] = await Promise.all([
    getWorkoutData(today),
    getTargets(),
  ]);
  return (
    <WorkoutView
      statuses={sectionTargetStatuses("workout", { today, targets, workoutLogs })}
      workoutLogs={workoutLogs}
      bodyMetrics={bodyMetrics}
      workoutPlan={workoutPlan}
      heightCm={heightCm}
      activity={activity}
      today={today}
      canLog
    />
  );
}

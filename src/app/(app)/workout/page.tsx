import { dhakaToday } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getWorkoutData } from "@/lib/data/workout";
import { activity as sampleActivity, bodyMetrics as sampleMetrics, heightCm as sampleHeight, workoutLogs as sampleLogs, workoutPlan as samplePlan } from "@/lib/sample-data";
import { WorkoutView } from "./workout-view";

export default async function WorkoutPage() {
  const today = dhakaToday();

  if (!isSupabaseConfigured) {
    return (
      <WorkoutView
        workoutLogs={sampleLogs}
        bodyMetrics={sampleMetrics}
        workoutPlan={samplePlan}
        heightCm={sampleHeight}
        activity={sampleActivity}
        today={today}
      />
    );
  }

  const { workoutLogs, bodyMetrics, workoutPlan, heightCm, activity } = await getWorkoutData(today);
  return (
    <WorkoutView
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

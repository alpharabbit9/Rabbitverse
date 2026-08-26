import { startOfWeek } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOverviewData } from "@/lib/data/overview";
import { DEFAULT_TARGETS, computeTargetStatuses, worstLevel } from "@/lib/targets";
import { moodState } from "@/lib/life-score";
import { headline, mascotSays, mascotStateFor } from "@/lib/motivation";
import {
  activity,
  bodyMetrics,
  expenses,
  journal,
  lifeBalance,
  lifeTrend,
  profile,
  projects,
  score,
  scoreMeta,
  signals,
  todayTimeline,
  workoutLogs,
} from "@/lib/sample-data";
import { OverviewView } from "./overview-view";
import { currentDay } from "@/lib/session";

/** Demo has no saved targets, so the weekly cap is the documented default. */
const DEMO_BUDGET = DEFAULT_TARGETS.weeklyExpenseCap ?? 6000;

export default async function OverviewPage() {
  const today = await currentDay();

  if (isSupabaseConfigured) {
    const data = await getOverviewData(today);
    return <OverviewView today={today} {...data} />;
  }

  // Demo mode: derive the motivation layer the same way the live path does.
  const weekStart = startOfWeek(today);
  const spendWeek = expenses.filter((e) => e.date >= weekStart && e.date <= today).reduce((a, e) => a + e.amount, 0);
  const deltaVsLastWeek = score - (lifeTrend[lifeTrend.length - 8]?.value ?? score);
  const todayActivity = activity.find((a) => a.date === today);
  // Demo evaluates the default targets against the sample rows, so the warnings
  // (and the mood/mascot nudge they cause) behave exactly as they do live.
  const statuses = computeTargetStatuses({ today, targets: DEFAULT_TARGETS, expenses, workoutLogs, journal, projects });
  const worst = worstLevel(statuses);

  return (
    <OverviewView
      today={today}
      isDemo
      budget={DEMO_BUDGET}
      profile={{ name: profile.name, level: profile.level, streakDays: profile.streakDays }}
      projects={projects}
      workoutLogs={workoutLogs}
      bodyMetrics={bodyMetrics}
      expenses={expenses}
      journal={journal}
      activity={activity}
      signals={signals}
      score={score}
      scoreMeta={scoreMeta}
      mood={moodState(signals, score, worst)}
      lifeTrend={lifeTrend}
      lifeBalance={lifeBalance}
      todayTimeline={todayTimeline}
      headline={headline(signals, deltaVsLastWeek)}
      insights={mascotSays(signals, spendWeek, DEMO_BUDGET)}
      mascotState={mascotStateFor(todayActivity, score, worst)}
      statuses={statuses}
    />
  );
}

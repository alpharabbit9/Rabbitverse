import { addDays, dhakaToday, eachDay } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOverviewData } from "@/lib/data/overview";
import { headline, rabbitSays, rabbitStateFor } from "@/lib/motivation";
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
  workoutLogs,
} from "@/lib/sample-data";
import { OverviewView } from "./overview-view";

const DEMO_BUDGET = 6000;

export default async function OverviewPage() {
  const today = dhakaToday();

  if (isSupabaseConfigured) {
    const data = await getOverviewData(today);
    return <OverviewView today={today} {...data} />;
  }

  // Demo mode: derive the motivation layer the same way the live path does.
  const last7 = eachDay(addDays(today, -6), today);
  const spendWeek = expenses.filter((e) => last7.includes(e.date)).reduce((a, e) => a + e.amount, 0);
  const deltaVsLastWeek = score - (lifeTrend[lifeTrend.length - 8]?.value ?? score);
  const todayActivity = activity.find((a) => a.date === today);

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
      mood={mood}
      lifeTrend={lifeTrend}
      lifeBalance={lifeBalance}
      todayTimeline={todayTimeline}
      headline={headline(signals, deltaVsLastWeek)}
      insights={rabbitSays(signals, spendWeek, DEMO_BUDGET)}
      rabbitState={rabbitStateFor(todayActivity, score)}
    />
  );
}

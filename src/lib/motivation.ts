import type { MascotState } from "@/components/mascot/types";
import type { LifeSignals } from "./life-score";
import type { TargetLevel } from "./targets";
import type { DayActivity, MoodState } from "./types";
import { money, type MoneyOptions } from "./money";

/*
  Rule-based encouragement engine. Data-aware, templated messages that feel
  personal without any AI. In v2 this is swapped for AI-generated advice.
*/

export function headline(signals: LifeSignals, deltaVsLastWeek: number): string {
  if (signals.streakDays >= 10) return `You're on a ${signals.streakDays}-day streak — unstoppable.`;
  if (deltaVsLastWeek > 3) return "You're doing better than last week.";
  if (deltaVsLastWeek < -3) return "A slower week — small steps still count.";
  if (signals.focus >= 80) return "Consistent and focused. Keep the rhythm.";
  return "Here's how your life is going today.";
}

/**
 * The mascot's pose — whichever creature the user picked wears it. `targetLevel`
 * holds back the celebration when something is off-track: the mascot still runs,
 * it just doesn't throw a party while a deadline is blown or a cap is busted.
 */
export function mascotStateFor(
  todayActivity: DayActivity | undefined,
  score: number,
  targetLevel: TargetLevel = "ok",
): MascotState {
  const total = todayActivity ? Object.values(todayActivity.counts).reduce((a, b) => a + b, 0) : 0;
  if (total === 0) return "sleeping";
  if (score >= 95) return targetLevel === "over" ? "running" : "celebrating";
  if (score >= 80) return "running";
  return "walking";
}

export interface Insight {
  icon: string;
  text: string;
  tone?: string;
}

/**
 * "<Mascot> says" — 2–3 context-aware lines from the week's signals.
 *
 * `locale` carries the user's currency and language tag so the budget line is
 * formatted the way the rest of their app is; it defaults to BDT/en for demo.
 */
export function mascotSays(
  signals: LifeSignals,
  weekSpend: number,
  budget: number,
  locale: Pick<MoneyOptions, "currency" | "locale"> = {},
): Insight[] {
  const out: Insight[] = [];

  if (signals.focus >= 70) {
    out.push({ icon: "CheckCircle2", text: `You've logged activity ${Math.round((signals.focus / 100) * 7)} of the last 7 days.`, tone: "var(--accent-mint)" });
  } else {
    out.push({ icon: "Wind", text: "A few quiet days — a quick log today keeps the streak alive.", tone: "var(--accent-gold)" });
  }

  if (signals.fitness >= 60) {
    out.push({ icon: "Dumbbell", text: "Workout consistency is strong this week. Your body thanks you.", tone: "var(--accent-purple)" });
  }

  if (weekSpend > budget) {
    out.push({ icon: "TrendingUp", text: `Spending is ${money(weekSpend - budget, { ...locale, compact: true })} over budget — worth a glance.`, tone: "var(--accent-orange)" });
  } else {
    out.push({ icon: "Wallet", text: `Nicely under budget with ${money(budget - weekSpend, { ...locale, compact: true })} to spare.`, tone: "var(--accent-mint)" });
  }

  return out.slice(0, 3);
}

export const MOOD_EMOJI: Record<MoodState, string> = {
  great: "😊",
  streak: "🔥",
  steady: "🙂",
  difficult: "😌",
};

export const MOOD_LABEL: Record<MoodState, string> = {
  great: "Great",
  streak: "On fire",
  steady: "Steady",
  difficult: "Gentle",
};

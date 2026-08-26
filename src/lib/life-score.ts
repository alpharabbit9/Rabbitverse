import type { TargetLevel } from "./targets";
import type { MoodState } from "./types";
import { clamp } from "./utils";

/*
  The Life Score is Rabbit Verse's headline metric (0–100): a weighted blend of
  the four life areas plus consistency. Mood Mode reads the same signals to pick
  a UI tone. Keep this small and tunable — it is the "brain" behind the numbers.
*/

export interface LifeSignals {
  /** 0–100: progress momentum across active projects */
  productivity: number;
  /** 0–100: workout consistency this week */
  fitness: number;
  /** 0–100: spending health (under budget = high) */
  money: number;
  /** 0–100: mental wellbeing (avg mood, journaling) */
  mental: number;
  /** 0–100: overall logging consistency */
  focus: number;
  /** current streak length in days */
  streakDays: number;
}

const WEIGHTS = { productivity: 0.24, fitness: 0.2, money: 0.18, mental: 0.22, focus: 0.16 };

export function lifeScore(s: LifeSignals): number {
  const base =
    s.productivity * WEIGHTS.productivity +
    s.fitness * WEIGHTS.fitness +
    s.money * WEIGHTS.money +
    s.mental * WEIGHTS.mental +
    s.focus * WEIGHTS.focus;
  const streakBonus = Math.min(6, s.streakDays * 0.4);
  return Math.round(clamp(base + streakBonus, 0, 100));
}

export function scoreLabel(score: number): { label: string; tone: string } {
  if (score >= 95) return { label: "On Fire!", tone: "var(--accent-orange)" };
  if (score >= 85) return { label: "Excellent", tone: "var(--accent-mint)" };
  if (score >= 70) return { label: "Great", tone: "var(--accent-blue)" };
  if (score >= 55) return { label: "Good", tone: "var(--accent-cyan)" };
  if (score >= 40) return { label: "Needs Focus", tone: "var(--accent-gold)" };
  return { label: "Low", tone: "var(--accent-orange)" };
}

/**
 * Decide the Mood Mode tone from the week's signals.
 *
 * `targetLevel` (V2 Pillar 2) is the worst of the user's target statuses. It
 * only ever *caps* the mood, never lifts it: being over a cap or past a
 * deadline shouldn't read as a great week, but falling behind also shouldn't
 * drag a genuinely good week down to "difficult". A calm nudge, not a scold.
 */
export function moodState(s: LifeSignals, score: number, targetLevel: TargetLevel = "ok"): MoodState {
  const base: MoodState =
    s.streakDays >= 10 && score >= 90 ? "streak" : score >= 82 ? "great" : score < 60 ? "difficult" : "steady";

  if (targetLevel === "over" && (base === "streak" || base === "great")) return "steady";
  if (targetLevel === "warn" && base === "streak") return "great";
  return base;
}

export const MOOD_COPY: Record<MoodState, { title: string; sub: string }> = {
  great: { title: "Great week", sub: "Bright, energetic & confident" },
  streak: { title: "On a streak", sub: "Bold, energetic & motivating" },
  steady: { title: "Steady week", sub: "Calm and consistent" },
  difficult: { title: "Difficult week", sub: "Calm, soft & supportive" },
};

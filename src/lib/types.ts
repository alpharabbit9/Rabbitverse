/* Core domain types for Rabbit Verse. */

export type SectionKey = "projects" | "workout" | "expenses" | "mental";

export const SECTIONS: SectionKey[] = ["projects", "workout", "expenses", "mental"];

export interface Profile {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  streakDays: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  done: boolean;
}

/** A dated progress update — the app's "commit". One per day per project. */
export interface ProjectCommit {
  id: string;
  date: string; // yyyy-mm-dd
  note: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  goals?: string; // longer "why / vision" for the project
  targetValue: number;
  targetUnit: string; // "%", "sessions", "words", …
  current: number;
  status: "ongoing" | "completed";
  startDate: string;
  targetDate?: string;
  tasks?: ProjectTask[]; // milestone checklist; when present, drives progress %
  commits?: ProjectCommit[]; // dated written updates (detail view only)
  daysWorked?: number; // distinct days an update was logged
}

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string; // css var or hex
  icon: string; // lucide icon name
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  categoryId: string;
  note?: string;
}

export interface WorkoutPlanDay {
  weekday: number; // Mon=0 … Sun=6
  label: string;
  focus: string;
}

export interface WorkoutLog {
  date: string;
  done: boolean;
  planLabel: string;
  note?: string;
}

export interface BodyMetric {
  date: string;
  weightKg: number;
  bodyFatPct?: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  body: string;
}

export interface TimelineEvent {
  time: string; // "09:00"
  section: SectionKey | "system";
  title: string;
  subtitle?: string;
}

export interface DayActivity {
  date: string;
  counts: Record<SectionKey, number>;
}

export type Range = "week" | "month" | "year";
export type MoodState = "great" | "streak" | "steady" | "difficult";

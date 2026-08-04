import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import {
  activeDayCount,
  buildActivity,
  bump,
  computeStreak,
  progressionFromActiveDays,
  type SectionCounts,
} from "@/lib/aggregate";

export interface ProfileSummary {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  level: number;
  streakDays: number;
  xp: number;
  xpToNext: number;
}

export async function getProfileSummary(today: string): Promise<ProfileSummary> {
  const supabase = await createClient();
  const start = addDays(today, -60);

  const [{ data: userRes }, { data: prof }, { data: exp }, { data: wo }, { data: jr }, { data: pl }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("display_name").maybeSingle(),
      supabase.from("expenses").select("spent_at").gte("spent_at", start),
      supabase.from("workout_logs").select("log_date,done").gte("log_date", start),
      supabase.from("journal_entries").select("entry_date").gte("entry_date", start),
      supabase.from("project_logs").select("log_date").gte("log_date", start),
    ]);

  const user = userRes?.user;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (prof?.display_name as string | undefined) ||
    (typeof meta.full_name === "string" ? meta.full_name : "") ||
    (typeof meta.name === "string" ? meta.name : "") ||
    "Rifat";
  const name = fullName.split(" ")[0] || "Rifat";
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const e of exp ?? []) bump(byDate, String(e.spent_at), "expenses");
  for (const w of wo ?? []) if (w.done) bump(byDate, String(w.log_date), "workout");
  for (const j of jr ?? []) bump(byDate, String(j.entry_date), "mental");
  for (const p of pl ?? []) bump(byDate, String(p.log_date), "projects");
  const activity = buildActivity(start, today, byDate);

  const streakDays = computeStreak(activity, today);
  const prog = progressionFromActiveDays(activeDayCount(activity));
  return { name, email: user?.email ?? null, avatarUrl, level: prog.level, streakDays, xp: prog.xp, xpToNext: prog.xpToNext };
}

"use server";

import { revalidatePath } from "next/cache";
import { addDays, dhakaToday } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type LogResult = { ok: boolean; error: string | null };

/** Save today's (or yesterday's) mood + journal reflection — one entry per day. */
export async function saveJournal(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const mood = Number(formData.get("mood"));
  if (!mood || mood < 1 || mood > 5) return { ok: false, error: "Pick how your day felt (1–5)." };

  const body = ((formData.get("body") as string) || "").trim().slice(0, 2000) || null;
  const entryDate = (formData.get("entry_date") as string) || dhakaToday();

  const today = dhakaToday();
  if (entryDate !== today && entryDate !== addDays(today, -1)) {
    return { ok: false, error: "You can only log today or yesterday." };
  }

  const { error } = await supabase
    .from("journal_entries")
    .upsert({ user_id: user.id, entry_date: entryDate, mood, body }, { onConflict: "user_id,entry_date" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/mental-health");
  revalidatePath("/");
  return { ok: true, error: null };
}

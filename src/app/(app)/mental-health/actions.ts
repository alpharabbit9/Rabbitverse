"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { currentDay } from "@/lib/session";

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
  const today = await currentDay();
  const entryDate = (formData.get("entry_date") as string) || today;
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

/**
 * Edit an existing reflection by id — mood and body only (V3.0 Phase F). The
 * entry's date is fixed (journal is one row per day), and editing an old entry
 * is allowed on purpose, so this skips the today/yesterday window `saveJournal`
 * enforces for *new* entries. RLS scopes the update to the owner's own rows.
 */
export async function updateJournalEntry(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Missing entry." };

  const mood = Number(formData.get("mood"));
  if (!mood || mood < 1 || mood > 5) return { ok: false, error: "Pick how your day felt (1–5)." };
  const body = ((formData.get("body") as string) || "").trim().slice(0, 2000) || null;

  const { error } = await supabase.from("journal_entries").update({ mood, body }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/mental-health");
  revalidatePath("/");
  return { ok: true, error: null };
}

/** Permanently remove a reflection. RLS keeps it to the owner's own rows. */
export async function deleteJournalEntry(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Missing entry." };

  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/mental-health");
  revalidatePath("/");
  return { ok: true, error: null };
}

"use server";

import { revalidatePath } from "next/cache";
import { addDays, dhakaToday } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type LogResult = { ok: boolean; error: string | null };

/**
 * Insert a real expense for the signed-in user. RLS ensures the row can only be
 * written for auth.uid(). Enforces the today+yesterday logging window.
 */
export async function addExpense(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) return { ok: false, error: "Enter an amount greater than 0." };

  const category_id = (formData.get("category_id") as string) || null;
  const note = ((formData.get("note") as string) || "").trim().slice(0, 200) || null;
  const spent_at = (formData.get("spent_at") as string) || dhakaToday();

  const today = dhakaToday();
  if (spent_at !== today && spent_at !== addDays(today, -1)) {
    return { ok: false, error: "You can only log today or yesterday." };
  }

  const { error } = await supabase.from("expenses").insert({ user_id: user.id, amount, category_id, note, spent_at });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/quick-add");
  revalidatePath("/expenses");
  revalidatePath("/");
  return { ok: true, error: null };
}

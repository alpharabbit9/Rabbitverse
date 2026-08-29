"use server";

/*
  Edit & delete for logged expenses (V3.0 Phase F).

  Logging (`quick-add/actions.ts::addExpense`) is fenced to today+yesterday so a
  streak can't be back-filled. Editing is the opposite — fixing a mistyped ৳4500
  from three weeks ago makes the month *truer* — so these carry no lower date
  bound (see `lib/edit.ts`). RLS (`auth.uid() = user_id`) is what actually scopes
  each write to its owner: the client sends only the row id + the change, never
  ownership, and a row it doesn't own simply won't match.
*/

import { revalidatePath } from "next/cache";
import { isEditableDate } from "@/lib/edit";
import { currentDay } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getExpenseHistory } from "@/lib/data/expenses";
import type { Expense } from "@/lib/types";

export type LogResult = { ok: boolean; error: string | null };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateAll() {
  revalidatePath("/expenses");
  revalidatePath("/");
}

/** Edit an existing expense — amount, category, note and (past) date. */
export async function updateExpense(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Missing expense." };

  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) return { ok: false, error: "Enter an amount greater than 0." };

  const category_id = (formData.get("category_id") as string) || null;
  const note = ((formData.get("note") as string) || "").trim().slice(0, 200) || null;

  const today = await currentDay();
  const spent_at = (formData.get("spent_at") as string) || today;
  // Editing may reach back to any real past date — just never the future.
  if (!isEditableDate(spent_at, today)) return { ok: false, error: "Pick today or a past date." };

  const { error } = await supabase
    .from("expenses")
    .update({ amount, category_id, note, spent_at })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

/** Fetch all expenses for a given month (yyyy-mm). Used by the HistoryPanel. */
export async function fetchMonthExpenses(month: string): Promise<Expense[]> {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  return getExpenseHistory(month);
}

/** Permanently remove an expense. RLS keeps it to the owner's own rows. */
export async function deleteExpense(_prev: LogResult, formData: FormData): Promise<LogResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Missing expense." };

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true, error: null };
}

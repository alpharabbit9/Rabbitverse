import { cache } from "react";
import { addDays, endOfMonth } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { buildActivity, bump, type SectionCounts } from "@/lib/aggregate";
import { HEATMAP_DAYS, shapeCategories, shapeExpenses } from "@/lib/data/shared";
import type { DayActivity, Expense, ExpenseCategory } from "@/lib/types";

export async function getExpensesData(today: string): Promise<{
  categories: ExpenseCategory[];
  expenses: Expense[];
  activity: DayActivity[];
}> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);
  const [categories, { data: rows }] = await Promise.all([
    getCategories(),
    supabase.from("expenses").select("id,spent_at,amount,note,category_id").gte("spent_at", start).order("spent_at"),
  ]);

  const expenses = shapeExpenses(rows);
  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const e of expenses) bump(byDate, e.date, "expenses");
  return { categories, expenses, activity: buildActivity(start, today, byDate) };
}

/**
 * The user's spend categories — presets first, then their own, alphabetically.
 * `cache()`d because both the Expenses page and the Settings editor ask for them
 * in the same request cycle.
 */
export const getCategories = cache(async function getCategories(): Promise<ExpenseCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expense_categories")
    .select("id,name,color,icon,is_preset")
    .order("is_preset", { ascending: false })
    .order("name");
  return shapeCategories(data);
});

/** Every expense in one calendar month ("yyyy-mm") — the History panel's pager. */
export async function getExpenseHistory(month: string): Promise<Expense[]> {
  const supabase = await createClient();
  const start = `${month}-01`;
  const end = endOfMonth(start);
  const { data: rows } = await supabase
    .from("expenses")
    .select("id,spent_at,amount,note,category_id")
    .gte("spent_at", start)
    .lte("spent_at", end)
    .order("spent_at", { ascending: false });
  return shapeExpenses(rows);
}

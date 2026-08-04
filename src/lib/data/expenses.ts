import { addDays } from "@/lib/dates";
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
  const [{ data: cats }, { data: rows }] = await Promise.all([
    supabase.from("expense_categories").select("id,name,color,icon").order("is_preset", { ascending: false }).order("name"),
    supabase.from("expenses").select("id,spent_at,amount,note,category_id").gte("spent_at", start).order("spent_at"),
  ]);

  const categories = shapeCategories(cats);
  const expenses = shapeExpenses(rows);
  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const e of expenses) bump(byDate, e.date, "expenses");
  return { categories, expenses, activity: buildActivity(start, today, byDate) };
}

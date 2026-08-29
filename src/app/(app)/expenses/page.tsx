import { addDays } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getExpensesData } from "@/lib/data/expenses";
import { getTargets } from "@/lib/data/targets";
import { DEFAULT_TARGETS, sectionTargetStatuses } from "@/lib/targets";
import { activity as sampleActivity, categories as sampleCategories, expenses as sampleExpenses } from "@/lib/sample-data";
import { Panel } from "@/components/dashboard/panel";
import { ExpensesView } from "./expenses-view";
import { RecentExpenses } from "./recent-expenses";
import { ExpenseForm } from "@/components/quick-add/expense-form";
import { addExpense } from "../quick-add/actions";
import { currentDay, getLocaleContext } from "@/lib/session";

export default async function ExpensesPage() {
  const today = await currentDay();

  if (!isSupabaseConfigured) {
    // Demo uses the default targets so the warnings are visible without keys.
    const statuses = sectionTargetStatuses("expenses", { today, targets: DEFAULT_TARGETS, expenses: sampleExpenses });
    return <ExpensesView categories={sampleCategories} expenses={sampleExpenses} activity={sampleActivity} today={today} statuses={statuses} />;
  }

  const [{ categories, expenses, activity }, targets, { currency, locale }] = await Promise.all([
    getExpensesData(today),
    getTargets(),
    getLocaleContext(),
  ]);
  const statuses = sectionTargetStatuses("expenses", { today, targets, expenses, currency, locale });
  const recent = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  const logSlot = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Log an expense" subtitle="Today or yesterday · saves instantly">
        {categories.length ? (
          <ExpenseForm categories={categories} today={today} yesterday={addDays(today, -1)} action={addExpense} />
        ) : (
          <p className="text-sm text-fg-muted">Categories seed on first sign-in — refresh in a moment.</p>
        )}
      </Panel>
      <Panel title="Recent" subtitle="Edit or delete any entry">
        <RecentExpenses expenses={recent} categories={categories} today={today} yesterday={addDays(today, -1)} />
      </Panel>
    </div>
  );

  return (
    <ExpensesView
      categories={categories}
      expenses={expenses}
      activity={activity}
      today={today}
      statuses={statuses}
      logSlot={logSlot}
      canFetch
    />
  );
}

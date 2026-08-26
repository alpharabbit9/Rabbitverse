import { addDays, shortDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getExpensesData } from "@/lib/data/expenses";
import { getTargets } from "@/lib/data/targets";
import { DEFAULT_TARGETS, sectionTargetStatuses } from "@/lib/targets";
import { activity as sampleActivity, categories as sampleCategories, expenses as sampleExpenses } from "@/lib/sample-data";
import { Panel } from "@/components/dashboard/panel";
import { Icon } from "@/components/icon";
import { ExpensesView } from "./expenses-view";
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
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const logSlot = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Log an expense" subtitle="Today or yesterday · saves instantly">
        {categories.length ? (
          <ExpenseForm categories={categories} today={today} yesterday={addDays(today, -1)} action={addExpense} />
        ) : (
          <p className="text-sm text-fg-muted">Categories seed on first sign-in — refresh in a moment.</p>
        )}
      </Panel>
      <Panel title="Recent" subtitle="Straight from your database">
        {recent.length ? (
          <ul className="space-y-2.5">
            {recent.map((e) => {
              const c = e.categoryId ? catMap.get(e.categoryId) : undefined;
              return (
                <li key={e.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                  <span className="flex items-center gap-2.5 text-sm">
                    <Icon name={c?.icon ?? "Wallet"} size={16} style={{ color: c?.color ?? "var(--accent-mint)" }} />
                    <span>
                      <span className="font-medium">{c?.name ?? "Expense"}</span>
                      {e.note ? <span className="text-fg-muted"> · {e.note}</span> : null}
                      <span className="block text-xs text-fg-muted">{shortDate(e.date)}</span>
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{money(e.amount, { currency, locale })}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
            Nothing logged yet — add your first expense on the left. 🐇
          </div>
        )}
      </Panel>
    </div>
  );

  return <ExpensesView categories={categories} expenses={expenses} activity={activity} today={today} statuses={statuses} logSlot={logSlot} />;
}

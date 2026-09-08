"use client";

import type { ReactNode } from "react";
import { addDays, daysBetween, eachDay, shortDate, startOfMonth, startOfWeek } from "@/lib/dates";
import type { DayActivity, Expense, ExpenseCategory } from "@/lib/types";
import type { TargetStatus } from "@/lib/targets";
import { TargetWarnings } from "@/components/dashboard/target-warning";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Icon } from "@/components/icon";
import { useCurrencySymbol, useMoney } from "@/components/locale-provider";
import { RangeToggle, useRange } from "@/components/ui/range-toggle";
import { rangeStart } from "@/lib/range";
import { HistoryPanel } from "./history-panel";

/** How a week reads against the one before it — same three cases everywhere. */
const WEEK_TONE = {
  up: { label: "Up vs last week", subtitle: "Trending up — worth a glance", color: "var(--accent-orange)" },
  down: { label: "Down vs last week", subtitle: "Trending down — nice control", color: "var(--accent-mint)" },
  flat: { label: "Same as last week", subtitle: "Steady with last week", color: "var(--accent-blue)" },
} as const;

export function ExpensesView({
  categories,
  expenses,
  activity,
  today,
  statuses = [],
  logSlot,
  canFetch = false,
}: {
  categories: ExpenseCategory[];
  expenses: Expense[];
  activity: DayActivity[];
  today: string;
  statuses?: TargetStatus[];
  logSlot?: ReactNode;
  /** Live mode only: the History panel may page back past the loaded year. */
  canFetch?: boolean;
}) {
  const money = useMoney();
  const symbol = useCurrencySymbol();
  const [range, setRange] = useRange();
  const from = rangeStart(today, range);
  const rangeDays = eachDay(from, today);
  const sum = (from: string, to: string) =>
    expenses.filter((e) => e.date >= from && e.date <= to).reduce((a, e) => a + e.amount, 0);

  // "This week" / "This month" mean the real week and calendar month in the
  // user's timezone —
  // the same boundaries the target warnings above use, so the card and the
  // banner can never contradict each other.
  const weekStart = startOfWeek(today);
  const monthStart = startOfMonth(today);
  const todaySpend = sum(today, today);
  const week = sum(weekStart, today);
  const month = sum(monthStart, today);
  const daysIntoMonth = daysBetween(monthStart, today) + 1;
  const avg = Math.round(month / daysIntoMonth);

  // Compare like with like: the same number of elapsed days in the week before,
  // so a Wednesday isn't measured against a full previous week.
  const daysIntoWeek = daysBetween(weekStart, today);
  const prevWeek = sum(addDays(weekStart, -7), addDays(weekStart, -7 + daysIntoWeek));
  // Three-way, not a boolean: `week >= prevWeek` called an empty account
  // "trending up" (0 >= 0) and called an unchanged week a decline.
  const dir: "up" | "down" | "flat" = week > prevWeek ? "up" : week < prevWeek ? "down" : "flat";

  const byCat = categories
    .map((c) => ({ ...c, total: expenses.filter((e) => e.categoryId === c.id && e.date >= from && e.date <= today).reduce((a, e) => a + e.amount, 0) }))
    .sort((a, b) => b.total - a.total);
  const maxCat = Math.max(1, ...byCat.map((c) => c.total));

  const trend = rangeDays.map((d) => ({ label: shortDate(d), value: expenses.filter((e) => e.date === d).reduce((a, e) => a + e.amount, 0) }));
  const hasData = expenses.length > 0;

  return (
    <div className="space-y-6 sm:space-y-7">
      <header>
        <h1 className="heading-display text-2xl font-bold">Expenses</h1>
        <p className="mt-1 text-sm text-fg-secondary">Where your money actually goes</p>
      </header>

      <TargetWarnings statuses={statuses} />

      {logSlot}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard index={0} icon="Wallet" label="Today" accent="var(--accent-mint)" value={money(todaySpend)} />
        <StatCard index={1} icon="Calendar" label="This week" accent="var(--accent-blue)" value={money(week)} toneLabel={hasData ? WEEK_TONE[dir].label : undefined} toneColor={WEEK_TONE[dir].color} />
        <StatCard index={2} icon="Calendar" label="This month" accent="var(--accent-purple)" value={money(month)} />
        <StatCard index={3} icon="Activity" label="Avg / day" accent="var(--accent-cyan)" value={money(avg)} />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Panel title="Spending Trend" className="lg:col-span-2" subtitle={hasData ? WEEK_TONE[dir].subtitle : "Nothing logged yet"} action={<RangeToggle value={range} onChange={setRange} />}>
          {hasData ? (
            <TrendChart data={trend} color={WEEK_TONE[dir].color} height={240} suffix={symbol} />
          ) : (
            <EmptyChart label="Log an expense to start your spending trend." />
          )}
        </Panel>
        <Panel title="By Category" subtitle={`Last ${range}`}>
          {byCat.some((c) => c.total > 0) ? (
            <ul className="space-y-3">
              {byCat.map((c) => (
                <li key={c.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Icon name={c.icon} size={15} style={{ color: c.color }} />
                      {c.name}
                    </span>
                    <span className="tabular-nums text-fg-secondary">{money(c.total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-card-hover">
                    <div className="h-full rounded-full" style={{ width: `${(c.total / maxCat) * 100}%`, background: c.color }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-fg-muted">No spending yet this month.</p>
          )}
        </Panel>
      </div>

      <HistoryPanel expenses={expenses} categories={categories} today={today} canFetch={canFetch} />

      <Panel title="Spending Activity" subtitle="Days you logged an expense">
        <ActivityHeatmap activity={activity} section="expenses" today={today} />
      </Panel>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-fg-muted">
      <span className="max-w-[200px]">{label}</span>
    </div>
  );
}

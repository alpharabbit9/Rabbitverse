"use client";

import { addDays, eachDay, shortDate } from "@/lib/dates";
import { activity, categories, expenses, TODAY_ISO } from "@/lib/sample-data";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Icon } from "@/components/icon";
import { taka } from "@/lib/utils";

export default function ExpensesPage() {
  const last7 = eachDay(addDays(TODAY_ISO, -6), TODAY_ISO);
  const last30 = eachDay(addDays(TODAY_ISO, -29), TODAY_ISO);

  const today = expenses.filter((e) => e.date === TODAY_ISO).reduce((a, e) => a + e.amount, 0);
  const week = expenses.filter((e) => last7.includes(e.date)).reduce((a, e) => a + e.amount, 0);
  const month = expenses.filter((e) => last30.includes(e.date)).reduce((a, e) => a + e.amount, 0);
  const avg = Math.round(month / 30);

  const prevWeek = expenses
    .filter((e) => eachDay(addDays(TODAY_ISO, -13), addDays(TODAY_ISO, -7)).includes(e.date))
    .reduce((a, e) => a + e.amount, 0);
  const up = week >= prevWeek;

  const byCat = categories
    .map((c) => ({ ...c, total: expenses.filter((e) => e.categoryId === c.id && last30.includes(e.date)).reduce((a, e) => a + e.amount, 0) }))
    .sort((a, b) => b.total - a.total);
  const maxCat = Math.max(1, ...byCat.map((c) => c.total));

  const trend = last30.map((d) => ({ label: shortDate(d), value: expenses.filter((e) => e.date === d).reduce((a, e) => a + e.amount, 0) }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <p className="mt-1 text-sm text-fg-secondary">Where your money actually goes — in ৳ BDT</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard index={0} icon="Wallet" label="Today" accent="var(--accent-mint)" value={taka(today)} />
        <StatCard index={1} icon="Calendar" label="This week" accent="var(--accent-blue)" value={taka(week)} toneLabel={up ? "Up vs last week" : "Down vs last week"} toneColor={up ? "var(--accent-orange)" : "var(--accent-mint)"} />
        <StatCard index={2} icon="Calendar" label="This month" accent="var(--accent-purple)" value={taka(month)} />
        <StatCard index={3} icon="Activity" label="Avg / day" accent="var(--accent-cyan)" value={taka(avg)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Spending Trend" className="lg:col-span-2" subtitle={up ? "Trending up — worth a glance" : "Trending down — nice control"}>
          <TrendChart data={trend} color={up ? "var(--accent-orange)" : "var(--accent-mint)"} height={240} suffix="৳" />
        </Panel>
        <Panel title="By Category" subtitle="Last 30 days">
          <ul className="space-y-3">
            {byCat.map((c) => (
              <li key={c.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Icon name={c.icon} size={15} style={{ color: c.color }} />
                    {c.name}
                  </span>
                  <span className="tabular-nums text-fg-secondary">{taka(c.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-card-hover">
                  <div className="h-full rounded-full" style={{ width: `${(c.total / maxCat) * 100}%`, background: c.color }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Spending Activity" subtitle="Days you logged an expense">
        <ActivityHeatmap activity={activity} section="expenses" today={TODAY_ISO} />
      </Panel>
    </div>
  );
}

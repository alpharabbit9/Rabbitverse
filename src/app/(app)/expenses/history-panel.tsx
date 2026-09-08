"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { shortDate, weekdayShort } from "@/lib/dates";
import { filterExpenses, groupByDay, inMonth, monthLabel, monthOf, shiftMonth, totalOf } from "@/lib/history";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { useMoney } from "@/components/locale-provider";
import { Panel } from "@/components/dashboard/panel";
import { fetchMonthExpenses } from "./actions";

/*
  Everything you've ever logged, a month at a time.

  The page already ships a year of expenses, so recent months need no fetch —
  only stepping back past that window calls `fetchMonthExpenses`, and each
  fetched month is kept so stepping back and forth costs one round-trip per
  month. Grouping/filtering rules live in `lib/history.ts` (pure, tested).
*/

export function HistoryPanel({
  expenses: preloaded,
  categories,
  today,
  canFetch = false,
}: {
  expenses: Expense[];
  categories: ExpenseCategory[];
  today: string;
  /** Demo mode has no server to page against — hide the months it can't fill. */
  canFetch?: boolean;
}) {
  const money = useMoney();
  const currentMonth = monthOf(today);
  /** The oldest month the page's own year of rows covers. */
  const preloadedFloor = useMemo(
    () => preloaded.reduce((min, e) => (monthOf(e.date) < min ? monthOf(e.date) : min), currentMonth),
    [preloaded, currentMonth],
  );

  const [month, setMonth] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [fetched, setFetched] = useState<Map<string, Expense[]>>(new Map());
  const [loading, startTransition] = useTransition();

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const isPreloaded = useCallback((ym: string) => ym >= preloadedFloor && ym <= currentMonth, [preloadedFloor, currentMonth]);

  const monthExpenses = useMemo(
    () => (isPreloaded(month) ? preloaded.filter((e) => inMonth(e.date, month)) : (fetched.get(month) ?? [])),
    [month, preloaded, fetched, isPreloaded],
  );

  const goToMonth = useCallback(
    (ym: string) => {
      setMonth(ym);
      if (isPreloaded(ym) || fetched.has(ym) || !canFetch) return;
      startTransition(async () => {
        const rows = await fetchMonthExpenses(ym);
        setFetched((prev) => new Map(prev).set(ym, rows));
      });
    },
    [isPreloaded, fetched, canFetch],
  );

  const filtered = useMemo(
    () => filterExpenses(monthExpenses, { categoryId: catFilter, query: search }),
    [monthExpenses, catFilter, search],
  );
  const days = useMemo(() => groupByDay(filtered), [filtered]);

  const canGoBack = canFetch || shiftMonth(month, -1) >= preloadedFloor;
  const canGoForward = month < currentMonth;

  return (
    <Panel title="History" subtitle={`${monthLabel(month)} · ${money(totalOf(filtered))}`}>
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => goToMonth(shiftMonth(month, -1))}
            disabled={!canGoBack}
            aria-label="Previous month"
          >
            <Icon name="ChevronLeft" size={18} />
          </Button>
          <span className="text-sm font-semibold">{monthLabel(month)}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => goToMonth(shiftMonth(month, 1))}
            disabled={!canGoForward}
            aria-label="Next month"
          >
            <Icon name="ChevronRight" size={18} />
          </Button>
        </div>
        <div className="flex gap-2">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            aria-label="Filter by category"
            className="min-w-0 flex-1 rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-sm outline-none focus:border-border-strong"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="relative min-w-0 flex-1">
            <Icon
              name="Search"
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes"
              aria-label="Search notes"
              className="w-full rounded-xl border border-border bg-card-hover/60 py-2 pl-8 pr-3 text-sm outline-none focus:border-border-strong"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-fg-muted">Loading…</div>
      ) : days.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-center text-sm text-fg-muted">
          {search || catFilter ? "Nothing matches that filter." : `Nothing logged in ${monthLabel(month, true)}.`}
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.date}>
              <div className="mb-1.5 flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-xs font-medium text-fg-secondary">
                  {shortDate(day.date)}, {weekdayShort(day.date)}
                </span>
                <span className="text-xs font-semibold tabular-nums text-fg-secondary">{money(day.total)}</span>
              </div>
              <ul className="space-y-0.5">
                {day.expenses.map((e) => {
                  const c = catMap.get(e.categoryId);
                  return (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-card-hover/50"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm">
                        <Icon name={c?.icon ?? "Wallet"} size={15} style={{ color: c?.color ?? "var(--accent-mint)" }} />
                        <span className="min-w-0 truncate">
                          <span className="font-medium">{c?.name ?? "Expense"}</span>
                          {e.note && <span className="text-fg-muted"> · {e.note}</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{money(e.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

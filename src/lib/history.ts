/*
  Pure helpers behind the expense History panel: month arithmetic, filtering and
  day grouping. Kept out of the component so the grouping rules (newest day
  first, biggest amount first inside a day, totals per day) are testable.

  Everything here works on ISO day strings ("yyyy-mm-dd") and month strings
  ("yyyy-mm") — timezone-free by construction, like `lib/dates.ts`.
*/
import { MONTHS } from "@/lib/dates";
import type { Expense } from "@/lib/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** A month key ("2026-08") from any ISO day in it. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** True when an ISO day falls inside the given "yyyy-mm". */
export function inMonth(iso: string, month: string): boolean {
  return iso.slice(0, 7) === month;
}

/** Step a month key forward/back, rolling the year over. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-08" → "August 2026". `short: true` gives "Aug 2026". */
export function monthLabel(month: string, short = false): string {
  const [y, m] = month.split("-").map(Number);
  const names = short ? MONTHS : MONTH_NAMES;
  return `${names[m - 1] ?? month} ${y}`;
}

export interface DayGroup {
  date: string;
  expenses: Expense[];
  total: number;
}

/** Category + note-search filter. An empty filter passes everything through. */
export function filterExpenses(
  list: Expense[],
  { categoryId = "", query = "" }: { categoryId?: string; query?: string },
): Expense[] {
  const q = query.trim().toLowerCase();
  return list.filter(
    (e) => (!categoryId || e.categoryId === categoryId) && (!q || (e.note ?? "").toLowerCase().includes(q)),
  );
}

/**
 * Group into days, newest day first, biggest spend first inside each day, with
 * the day's total alongside. Ties keep their input order (`sort` is stable).
 */
export function groupByDay(list: Expense[]): DayGroup[] {
  const byDate = new Map<string, Expense[]>();
  for (const e of list) {
    const arr = byDate.get(e.date);
    if (arr) arr.push(e);
    else byDate.set(e.date, [e]);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, expenses]) => ({
      date,
      expenses: [...expenses].sort((a, b) => b.amount - a.amount),
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
    }));
}

/** Sum of a list — the panel's month total, after filtering. */
export function totalOf(list: Expense[]): number {
  return list.reduce((sum, e) => sum + e.amount, 0);
}

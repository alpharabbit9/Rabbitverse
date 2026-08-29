/*
  The shared chart range — 7d / 30d / 90d / 1y.

  Pure and dependency-light on purpose: `components/ui/range-toggle.tsx` is the
  "use client" wrapper that owns the buttons and the localStorage read, while the
  slicing every view does lives here so it can be tested without React.

  Every fetcher already reads a full 364-day window (`HEATMAP_DAYS`), so changing
  the range is client-side slicing — no refetch, no server round-trip.
*/
import { addDays } from "@/lib/dates";

export type RangeKey = "7d" | "30d" | "90d" | "1y";

export const RANGE_KEYS: readonly RangeKey[] = ["7d", "30d", "90d", "1y"] as const;

/** How many days each key covers, inclusive of today. */
export const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };

/** What a first-time visitor (and any unreadable localStorage) gets. */
export const DEFAULT_RANGE: RangeKey = "30d";

export function isRangeKey(value: unknown): value is RangeKey {
  return typeof value === "string" && (RANGE_KEYS as readonly string[]).includes(value);
}

/**
 * The first day inside the range. Inclusive of `today`, so "7d" spans today and
 * the six days before it — the same seven bars the week cards count.
 */
export function rangeStart(today: string, range: RangeKey): string {
  return addDays(today, -(RANGE_DAYS[range] - 1));
}

/** Rows dated inside the range. Future-dated rows are excluded. */
export function sliceRange<T extends { date: string }>(rows: T[], today: string, range: RangeKey): T[] {
  const start = rangeStart(today, range);
  return rows.filter((r) => r.date >= start && r.date <= today);
}

/**
 * The tail of an already-daily series (one point per day, oldest first) — used
 * for the Life-Score trend, which is generated day-by-day rather than filtered.
 */
export function sliceTail<T>(series: T[], range: RangeKey): T[] {
  return series.slice(-RANGE_DAYS[range]);
}

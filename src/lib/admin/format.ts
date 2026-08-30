/*
  Pure presentation helpers for the admin roster.

  All of it is arithmetic over numbers and ISO day strings, so it is unit-tested
  rather than eyeballed — the repo's rule is that only pure logic gets tests.
*/

import { daysBetween, shortDate } from "@/lib/dates";
import { COUNT_COLUMNS, type AdminCounts, type AdminUserRow, type SortDir, type SortKey } from "./types";

/** Every row this user owns, across all ten tables. The "how big is this account" number. */
export function totalRows(counts: AdminCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/**
 * What a delete is about to destroy, spelled out: `142 expenses · 61 journal
 * entries · 3 projects`.
 *
 * COUNTS, NEVER CONTENT — the same rule as the rest of the panel. The admin
 * confirming a deletion is told how much is going, not what any of it said.
 *
 * Empty tables are omitted rather than printed as zeros: a list of ten "0 …"
 * clauses buries the two numbers that actually matter.
 */
export function describeCounts(counts: AdminCounts): string {
  const parts = COUNT_COLUMNS.filter((c) => counts[c.key] > 0).map(
    (c) => `${counts[c.key]} ${c.noun[counts[c.key] === 1 ? 0 : 1]}`,
  );
  return parts.length > 0 ? parts.join(" · ") : "nothing at all — this account has never logged a row";
}

/** The value a sort key reads off a row. `null` sorts last in both directions. */
function sortValue(row: AdminUserRow, key: SortKey): string | number | null {
  switch (key) {
    case "created_at":
      return row.createdAt;
    case "email":
      return row.email.toLowerCase();
    case "name":
      return row.name ? row.name.toLowerCase() : null;
    case "status":
      return row.status;
    case "role":
      return row.role;
    case "last_active":
      return row.lastActive;
    case "total":
      return totalRows(row.counts);
    default:
      return row.counts[key];
  }
}

/**
 * Sort a page of rows in place-free fashion.
 *
 * Used for the count columns and `last_active`, which the RPC cannot order by
 * (see `admin_user_stats` in `0007_admin.sql`) — so this only ever reorders the
 * 25 rows already on screen, and the table says so next to the header.
 * Roster columns go through the URL and are sorted by Postgres instead.
 */
export function sortRowsBy(rows: AdminUserRow[], key: SortKey, dir: SortDir = "desc"): AdminUserRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    // Missing values sink to the bottom whichever way the column is pointing.
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av === bv) return a.email.localeCompare(b.email);
    return av > bv ? sign : -sign;
  });
}

/**
 * "today" / "yesterday" / "6 days ago" / "Mar 4" — how a day reads relative to
 * the admin's own today (their timezone, threaded down from `currentDay()`).
 */
export function relativeDay(iso: string, today: string): string {
  const delta = daysBetween(iso, today);
  if (delta <= 0) return "today";
  if (delta === 1) return "yesterday";
  if (delta < 7) return `${delta} days ago`;
  if (delta < 14) return "last week";
  if (delta < 60) return `${Math.round(delta / 7)} weeks ago`;
  return shortDate(iso);
}

/**
 * The mirror of `relativeDay`, pointing the other way: "in 6 days", "tomorrow",
 * "today". A day that has already gone falls back to `relativeDay`, so one cell
 * can hold both "expires in 6 days" and "expired last week".
 */
export function describeDeadline(iso: string, today: string): string {
  const delta = daysBetween(today, iso);
  if (delta < 0) return relativeDay(iso, today);
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  if (delta < 14) return `in ${delta} days`;
  if (delta < 60) return `in ${Math.round(delta / 7)} weeks`;
  return shortDate(iso);
}

/** The last-active cell, including the case where they have never written anything. */
export function describeLastActive(iso: string | null, today: string): string {
  return iso ? relativeDay(iso, today) : "never";
}

/** `1 – 25 of 312`, or an honest empty string when there is nothing to page. */
export function pageRangeLabel(total: number, offset: number, shown: number): string {
  if (total === 0) return "no users";
  const from = offset + 1;
  const to = offset + shown;
  return `${from}–${to} of ${total}`;
}

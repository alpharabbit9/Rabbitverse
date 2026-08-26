/*
  Date helpers. All "today / yesterday", streaks, heatmap buckets, and reminder
  logic in Rabbit Verse must use the *user's own* local time, never the
  server/UTC clock — a user in London logging at 23:00 must not have their day
  roll over at Dhaka's midnight. Dependency-free (Intl-based).

  Only four helpers below actually ask "what time is it now", and each takes a
  timezone. Everything else operates on ISO day strings ("yyyy-mm-dd") and is
  timezone-free by construction — do not add a `tz` parameter to those.

  The defaults keep Rifat's original Dhaka behaviour bit-identical.
*/

export const DEFAULT_TZ = "Asia/Dhaka";

/** Today's calendar date in `tz` as "yyyy-mm-dd". */
export function todayIn(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The current hour (0-23) in `tz`. */
export function hourIn(tz: string = DEFAULT_TZ, now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
}

/** Parse "yyyy-mm-dd" into a UTC-noon Date (safe for day arithmetic). */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** Format a Date back to "yyyy-mm-dd". */
export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Add days to an ISO day string. */
export function addDays(iso: string, days: number): string {
  const d = parseDay(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toDay(d);
}

/** Weekday index Mon=0 … Sun=6 for an ISO day. */
export function weekdayMon0(iso: string): number {
  const dow = parseDay(iso).getUTCDay(); // Sun=0
  return (dow + 6) % 7;
}

/** Monday that starts the week containing `iso`. */
export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayMon0(iso));
}

/** Inclusive list of ISO days from `start` to `end`. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Whether an ISO day is within the editable window (today or yesterday, in `tz`). */
export function isWithinLogWindow(iso: string, tz: string = DEFAULT_TZ, now: Date = new Date()): boolean {
  const today = todayIn(tz, now);
  return iso === today || iso === addDays(today, -1);
}

/** Time-of-day greeting for `tz`. */
export function greeting(tz: string = DEFAULT_TZ, now: Date = new Date()): { text: string; emoji: string } {
  const h = hourIn(tz, now);
  if (h < 5) return { text: "Good night", emoji: "🌙" };
  if (h < 12) return { text: "Good morning", emoji: "☀️" };
  if (h < 17) return { text: "Good afternoon", emoji: "🌤️" };
  if (h < 21) return { text: "Good evening", emoji: "🌆" };
  return { text: "Good evening", emoji: "🌙" };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function shortDate(iso: string): string {
  const d = parseDay(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS[weekdayMon0(iso)];
}

export { MONTHS, WEEKDAYS };

// ---- month / span helpers (pure ISO-day arithmetic, timezone-free) --------

/** First day of the calendar month containing `iso`. */
export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Last day of the calendar month containing `iso`. */
export function endOfMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return toDay(new Date(Date.UTC(y, m, 0, 12))); // day 0 of next month == last of this
}

/** Number of days in the calendar month containing `iso`. */
export function daysInMonth(iso: string): number {
  return Number(endOfMonth(iso).slice(8));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

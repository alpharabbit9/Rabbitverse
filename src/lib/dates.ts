/*
  Date helpers pinned to Asia/Dhaka (UTC+6). All "today / yesterday", streaks,
  heatmap buckets, and reminder logic in Rabbit Verse must use Dhaka local time,
  never the server/UTC clock. These helpers are dependency-free (Intl-based).
*/

export const TZ = "Asia/Dhaka";

/** Today's calendar date in Dhaka as "yyyy-mm-dd". */
export function dhakaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The current hour (0-23) in Dhaka. */
export function dhakaHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
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

/** Whether an ISO day is within the editable window (today or yesterday, Dhaka). */
export function isWithinLogWindow(iso: string, now: Date = new Date()): boolean {
  const today = dhakaToday(now);
  return iso === today || iso === addDays(today, -1);
}

/** Time-of-day greeting for Dhaka. */
export function greeting(now: Date = new Date()): { text: string; emoji: string } {
  const h = dhakaHour(now);
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

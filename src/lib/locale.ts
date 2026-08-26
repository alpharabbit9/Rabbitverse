/*
  Per-user locale context — timezone, currency, language tag.

  Pure and client-safe: this module holds the defaults, the validators and the
  shape. The *reading* of a user's actual values lives in `lib/session.ts`
  (server-only), and the client gets them through `LocaleProvider`.
*/
import { DEFAULT_TZ } from "@/lib/dates";
import { DEFAULT_CURRENCY, normalizeCurrency } from "@/lib/money";

export const DEFAULT_APP_LOCALE = "en";

export interface LocaleContext {
  /** IANA timezone — decides when "today" rolls over for this user. */
  tz: string;
  /** ISO-4217 code. */
  currency: string;
  /** BCP-47 language tag, for number and date grouping. */
  locale: string;
}

export const DEFAULT_LOCALE_CONTEXT: LocaleContext = {
  tz: DEFAULT_TZ,
  currency: DEFAULT_CURRENCY,
  locale: DEFAULT_APP_LOCALE,
};

/** Whether `tz` is an IANA zone this runtime knows. */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** Coerce anything to a usable IANA zone, falling back to the app default. */
export function normalizeTimeZone(tz: unknown): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TZ;
}

/** Whether `tag` is a BCP-47 language tag this runtime accepts. */
export function isValidLocale(tag: unknown): tag is string {
  if (typeof tag !== "string" || !tag.trim()) return false;
  try {
    return Intl.NumberFormat.supportedLocalesOf([tag]).length > 0 || Boolean(new Intl.Locale(tag));
  } catch {
    return false;
  }
}

/** Coerce anything to a usable language tag, falling back to "en". */
export function normalizeLocale(tag: unknown): string {
  return isValidLocale(tag) ? tag : DEFAULT_APP_LOCALE;
}

/** Normalise a whole context in one go — used wherever DB values are read. */
export function normalizeLocaleContext(input: Partial<Record<keyof LocaleContext, unknown>>): LocaleContext {
  return {
    tz: normalizeTimeZone(input.tz),
    currency: normalizeCurrency(input.currency),
    locale: normalizeLocale(input.locale),
  };
}

/**
 * Every IANA zone this runtime knows, for the Settings picker.
 * `Intl.supportedValuesOf` is ES2022 and present in Node 20+ and every browser
 * this PWA targets; the shortlist is the fallback if it ever isn't.
 */
export function allTimeZones(): string[] {
  try {
    const values = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (typeof values === "function") return values("timeZone");
  } catch {
    /* fall through */
  }
  return COMMON_TIMEZONES;
}

/** Offered first in the picker — the zones most likely to be wanted here. */
export const COMMON_TIMEZONES = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

/** "Asia/Dhaka" → "Asia / Dhaka (UTC+6)" for display in the picker. */
export function describeTimeZone(tz: string, now: Date = new Date()): string {
  const label = tz.replace(/_/g, " ").replace("/", " / ");
  try {
    const offset = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value;
    return offset ? `${label} (${offset})` : label;
  } catch {
    return label;
  }
}

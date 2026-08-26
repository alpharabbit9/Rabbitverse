/*
  Currency formatting. Pure and client-safe — no Supabase, no server imports.

  Replaces the old `taka()` in `lib/utils.ts`, which hardcoded ৳ and en-US
  grouping. Everything routes through `Intl.NumberFormat` so a user in Berlin on
  EUR gets "1.500,50 €" and Rifat on BDT keeps "৳1,500.5", from the same call.
*/

export const DEFAULT_CURRENCY = "BDT";

/**
 * The shortlist offered in Settings. Any valid ISO-4217 code works at runtime —
 * this is just the picker, ordered by how likely it is to be wanted here.
 */
export const CURRENCIES: { code: string; label: string }[] = [
  { code: "BDT", label: "Bangladeshi Taka" },
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "INR", label: "Indian Rupee" },
  { code: "PKR", label: "Pakistani Rupee" },
  { code: "AED", label: "UAE Dirham" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "MYR", label: "Malaysian Ringgit" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CNY", label: "Chinese Yuan" },
  { code: "TRY", label: "Turkish Lira" },
];

/** Whether `code` is a well-formed ISO-4217 currency code that Intl accepts. */
export function isValidCurrency(code: unknown): code is string {
  if (typeof code !== "string" || !/^[A-Za-z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code.toUpperCase() }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** Coerce anything to a usable currency code, falling back to the default. */
export function normalizeCurrency(code: unknown): string {
  return isValidCurrency(code) ? code.toUpperCase() : DEFAULT_CURRENCY;
}

export interface MoneyOptions {
  currency?: string;
  locale?: string;
  /** Abbreviate thousands ("৳1.5K") — used in the tight motivation strings. */
  compact?: boolean;
}

// Intl.NumberFormat construction is not free and these are called per row.
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string, currency: string, fraction: number, compact: boolean) {
  const key = `${locale}|${currency}|${fraction}|${compact}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      // "narrowSymbol" is what turns BDT into ৳ rather than "BDT".
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: fraction,
      ...(compact ? { notation: "compact" as const, compactDisplay: "short" as const } : {}),
    });
    formatters.set(key, f);
  }
  return f;
}

/**
 * Format an amount in the user's currency and locale.
 *
 * Whole numbers print without decimals ("৳15,000"); fractional ones keep up to
 * two ("৳450.5"). That matches what the app showed before, in every currency.
 */
export function money(amount: number, opts: MoneyOptions = {}): string {
  const currency = normalizeCurrency(opts.currency);
  const locale = opts.locale || "en";
  const value = Number.isFinite(amount) ? amount : 0;
  const compact = Boolean(opts.compact) && Math.abs(value) >= 1000;
  const fraction = compact ? 1 : Number.isInteger(value) ? 0 : 2;

  try {
    return formatter(locale, currency, fraction, compact).format(value);
  } catch {
    // An unusable locale tag should never blank out an amount.
    return formatter("en", currency, fraction, compact).format(value);
  }
}

/** The bare symbol for a currency ("৳", "$", "€") — for input prefixes and labels. */
export function currencySymbol(currency: string = DEFAULT_CURRENCY, locale = "en"): string {
  const code = normalizeCurrency(currency);
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

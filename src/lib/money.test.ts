import { describe, expect, it } from "vitest";
import { currencySymbol, isValidCurrency, money, normalizeCurrency } from "./money";
import { isValidTimeZone, normalizeLocaleContext, normalizeTimeZone } from "./locale";

describe("money", () => {
  it("keeps the pre-V3.0 Taka output byte-for-byte", () => {
    // These exact strings are what the target-warning tests assert on.
    expect(money(15000)).toBe("৳15,000");
    expect(money(1000)).toBe("৳1,000");
    expect(money(450)).toBe("৳450");
  });

  it("drops decimals for whole amounts and keeps them otherwise", () => {
    expect(money(450)).toBe("৳450");
    expect(money(450.5)).toBe("৳450.5");
    expect(money(450.55)).toBe("৳450.55");
  });

  it("follows the currency", () => {
    expect(money(1500, { currency: "USD" })).toBe("$1,500");
    expect(money(1500, { currency: "GBP" })).toBe("£1,500");
    expect(money(1500, { currency: "INR" })).toBe("₹1,500");
  });

  it("follows the locale's own grouping and symbol placement", () => {
    expect(money(1500, { currency: "INR", locale: "en-IN" })).toBe("₹1,500");
    // French puts the symbol last and groups with spaces.
    const fr = money(1500, { currency: "EUR", locale: "fr" });
    expect(fr).toContain("€");
    expect(fr.endsWith("€")).toBe(true);
  });

  it("abbreviates when compact, and only above a thousand", () => {
    expect(money(1500, { compact: true })).toBe("৳1.5K");
    expect(money(6000, { compact: true })).toBe("৳6K");
    expect(money(950, { compact: true })).toBe("৳950");
  });

  it("falls back rather than blanking out on bad input", () => {
    expect(money(1500, { currency: "NOTACODE" })).toBe("৳1,500"); // default currency
    expect(money(1500, { locale: "!!!" })).toBe("৳1,500"); // default locale
    expect(money(Number.NaN)).toBe("৳0");
  });
});

describe("currencySymbol", () => {
  it("returns the narrow symbol, not the ISO code", () => {
    expect(currencySymbol("BDT")).toBe("৳");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("EUR")).toBe("€");
  });

  it("falls back to the default currency's symbol for an unknown code", () => {
    // normalizeCurrency runs first, so junk becomes BDT — never a raw "NOTACODE"
    // leaking into an input prefix.
    expect(currencySymbol("NOTACODE")).toBe("৳");
    expect(currencySymbol("")).toBe("৳");
  });
});

describe("validation and normalisation", () => {
  it("accepts real currency codes, case-insensitively", () => {
    expect(isValidCurrency("usd")).toBe(true);
    expect(isValidCurrency("USD")).toBe(true);
    expect(isValidCurrency("US")).toBe(false);
    expect(isValidCurrency("")).toBe(false);
    expect(isValidCurrency(42)).toBe(false);
    expect(normalizeCurrency("usd")).toBe("USD");
    expect(normalizeCurrency(null)).toBe("BDT");
  });

  it("accepts real IANA zones only", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(normalizeTimeZone("Mars/Olympus_Mons")).toBe("Asia/Dhaka");
  });

  it("normalises a whole context, so a junk DB row can't break a page", () => {
    expect(normalizeLocaleContext({ tz: "Europe/Berlin", currency: "eur", locale: "de" })).toEqual({
      tz: "Europe/Berlin",
      currency: "EUR",
      locale: "de",
    });
    expect(normalizeLocaleContext({ tz: null, currency: undefined, locale: 7 })).toEqual({
      tz: "Asia/Dhaka",
      currency: "BDT",
      locale: "en",
    });
  });
});

"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { DEFAULT_LOCALE_CONTEXT, type LocaleContext } from "@/lib/locale";
import { currencySymbol, money as formatMoney, type MoneyOptions } from "@/lib/money";

/*
  Carries the signed-in user's timezone + currency down to client components.

  Seeded once in `(app)/layout.tsx` from `getLocaleContext()`, so no client
  component has to thread a `currency` prop through five levels — they call
  `useMoney()` and get formatting in whatever the user chose. In demo mode the
  provider is seeded with the app defaults, so nothing has to branch.
*/

const LocaleCtx = createContext<LocaleContext>(DEFAULT_LOCALE_CONTEXT);

export function LocaleProvider({
  value,
  children,
}: {
  value: LocaleContext;
  children: React.ReactNode;
}) {
  // The object identity would otherwise change on every layout render and
  // re-render every consumer.
  const stable = useMemo<LocaleContext>(
    () => ({ tz: value.tz, currency: value.currency, locale: value.locale }),
    [value.tz, value.currency, value.locale],
  );
  return <LocaleCtx.Provider value={stable}>{children}</LocaleCtx.Provider>;
}

/** The current user's `{ tz, currency, locale }`. */
export function useLocale(): LocaleContext {
  return useContext(LocaleCtx);
}

/** `money(amount, opts?)` already bound to the user's currency and locale. */
export function useMoney() {
  const { currency, locale } = useLocale();
  return useCallback(
    (amount: number, opts: Omit<MoneyOptions, "currency" | "locale"> = {}) =>
      formatMoney(amount, { ...opts, currency, locale }),
    [currency, locale],
  );
}

/** The user's currency symbol ("৳", "$", "€") — for input prefixes and labels. */
export function useCurrencySymbol(): string {
  const { currency, locale } = useLocale();
  return useMemo(() => currencySymbol(currency, locale), [currency, locale]);
}

/** Render an amount in the user's currency. */
export function Money({
  amount,
  compact,
  className,
}: {
  amount: number;
  compact?: boolean;
  className?: string;
}) {
  const money = useMoney();
  return <span className={className}>{money(amount, { compact })}</span>;
}

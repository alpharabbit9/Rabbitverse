"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { COMMON_TIMEZONES, allTimeZones, describeTimeZone } from "@/lib/locale";
import { CURRENCIES, currencySymbol } from "@/lib/money";
import { saveLocale } from "@/app/(app)/settings/actions";

/*
  Timezone + currency, the two things that used to be constants in the source.
  Both save immediately on change — there is no "save" button to forget, and a
  failed write rolls the select back to what the server still has.
*/

const selectCls =
  "w-full min-w-0 rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-sm text-fg " +
  "transition-colors hover:border-border-strong focus:border-border-strong focus:outline-none";

export function LocaleCard({
  timezone,
  currency,
}: {
  timezone: string;
  currency: string;
}) {
  const [tz, setTz] = useState(timezone);
  const [cur, setCur] = useState(currency);
  const [pending, startTransition] = useTransition();

  // The full IANA list, with the likely-wanted zones lifted to the top.
  const zones = useMemo(() => {
    const all = allTimeZones();
    const common = COMMON_TIMEZONES.filter((z) => all.includes(z));
    return { common, rest: all.filter((z) => !common.includes(z)) };
  }, []);

  const commit = (patch: { timezone?: string; currency?: string }, revert: () => void) => {
    startTransition(async () => {
      const res = await saveLocale(patch);
      if (res.ok) {
        toast.success(patch.timezone ? "Timezone updated ✓" : "Currency updated ✓");
      } else {
        revert();
        toast.error(res.error ?? "Could not save that.");
      }
    });
  };

  return (
    <div className={cn("space-y-4", pending && "opacity-70")}>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-2 text-sm text-fg-secondary">
          <Icon name="Globe" size={15} style={{ color: "var(--accent-blue)" }} />
          Timezone
        </span>
        <select
          className={selectCls}
          value={tz}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value;
            const prev = tz;
            setTz(next);
            commit({ timezone: next }, () => setTz(prev));
          }}
        >
          <optgroup label="Common">
            {zones.common.map((z) => (
              <option key={z} value={z}>
                {describeTimeZone(z)}
              </option>
            ))}
          </optgroup>
          <optgroup label="All timezones">
            {zones.rest.map((z) => (
              <option key={z} value={z}>
                {describeTimeZone(z)}
              </option>
            ))}
          </optgroup>
        </select>
        <p className="mt-1.5 text-xs text-fg-muted">
          Decides when your day rolls over — your streak, the today/yesterday window and reminders all
          follow it. Entries you already logged keep the dates they were logged on.
        </p>
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-2 text-sm text-fg-secondary">
          <Icon name="Wallet" size={15} style={{ color: "var(--accent-mint)" }} />
          Currency
        </span>
        <select
          className={selectCls}
          value={cur}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value;
            const prev = cur;
            setCur(next);
            commit({ currency: next }, () => setCur(prev));
          }}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {currencySymbol(c.code)} {c.code} — {c.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-fg-muted">
          Every amount, your spend caps and what the AI box reads &quot;spent 400&quot; as. Amounts are
          re-labelled, never converted.
        </p>
      </label>
    </div>
  );
}

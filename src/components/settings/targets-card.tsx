"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { useCurrencySymbol } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { DEFAULT_TARGETS, TARGET_LIMITS, type Targets, coerceTarget } from "@/lib/targets";
import { saveTargets } from "@/app/(app)/settings/actions";

type Field = {
  key: keyof Targets;
  label: string;
  hint: string;
  icon: string;
  accent: string;
  /** Render the user's currency symbol before the input. */
  money?: boolean;
  suffix?: string;
  step: number;
};

const FIELDS: Field[] = [
  {
    key: "monthlyExpenseCap",
    label: "Monthly spend cap",
    hint: "Rabbit warns at 80% and again when you cross it.",
    icon: "Wallet",
    accent: "var(--accent-gold)",
    money: true,
    step: 500,
  },
  {
    key: "weeklyExpenseCap",
    label: "Weekly spend cap",
    hint: "Also what the Life Score's money signal is measured against.",
    icon: "ReceiptText",
    accent: "var(--accent-cyan)",
    money: true,
    step: 250,
  },
  {
    key: "weeklyWorkouts",
    label: "Workouts per week",
    hint: "Falling behind the week's pace shows a nudge on Workout.",
    icon: "Dumbbell",
    accent: "var(--accent-mint)",
    suffix: "/ week",
    step: 1,
  },
  {
    key: "weeklyCheckIns",
    label: "Check-ins per week",
    hint: "How often you want to log a mood or a journal entry.",
    icon: "Brain",
    accent: "var(--accent-purple)",
    suffix: "/ week",
    step: 1,
  },
];

/**
 * Settings → Targets. Each row is a target that can be switched off entirely
 * (the toggle) or given a number. Saving writes the whole object through
 * `saveTargets`, which re-clamps every field server-side.
 */
export function TargetsCard({ initial }: { initial: Targets }) {
  const symbol = useCurrencySymbol();
  // Draft values are strings so the inputs stay editable mid-typing; `null`
  // means the target is switched off.
  const [draft, setDraft] = useState<Record<keyof Targets, string | null>>(() => ({
    monthlyExpenseCap: initial.monthlyExpenseCap?.toString() ?? null,
    weeklyExpenseCap: initial.weeklyExpenseCap?.toString() ?? null,
    weeklyWorkouts: initial.weeklyWorkouts?.toString() ?? null,
    weeklyCheckIns: initial.weeklyCheckIns?.toString() ?? null,
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);

  const set = (key: keyof Targets, value: string | null) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  const toggle = (key: keyof Targets) => {
    // Switching a target back on restores its saved value, then the app default
    // — never the bare minimum, which would read as "instantly over your cap".
    set(key, draft[key] === null ? (initial[key] ?? DEFAULT_TARGETS[key] ?? TARGET_LIMITS[key].min).toString() : null);
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    const payload = Object.fromEntries(
      (Object.keys(draft) as (keyof Targets)[]).map((k) => [k, draft[k] === null ? null : coerceTarget(k, draft[k])]),
    );
    const res = await saveTargets(payload);
    setSaving(false);
    if (res.ok) {
      // Reflect the clamped values the server actually stored.
      setDraft(
        Object.fromEntries(
          (Object.keys(payload) as (keyof Targets)[]).map((k) => [k, payload[k] === null ? null : String(payload[k])]),
        ) as Record<keyof Targets, string | null>,
      );
      setSaved(true);
      toast.success("Targets saved ✓");
    } else {
      toast.error(res.error ?? "Could not save targets.");
    }
  };

  return (
    <div className="space-y-3">
      {FIELDS.map((f) => {
        const value = draft[f.key];
        const off = value === null;
        return (
          <div key={f.key} className={cn("rounded-xl border p-3 transition-colors", off ? "border-border opacity-60" : "border-border")}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${f.accent} 15%, transparent)` }}>
                  <Icon name={f.icon} size={18} style={{ color: f.accent }} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="truncate text-xs text-fg-muted">{off ? "No target — warnings off" : f.hint}</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!off}
                aria-label={`Toggle ${f.label}`}
                onClick={() => toggle(f.key)}
                className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", off ? "bg-border-strong" : "bg-accent-purple")}
              >
                <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform", off ? "translate-x-0.5" : "translate-x-[22px]")} />
              </button>
            </div>

            {!off && (
              <label className="mt-3 flex items-center justify-end gap-2">
                {f.money && <span className="text-sm text-fg-muted">{symbol}</span>}
                <input
                  type="number"
                  inputMode="numeric"
                  value={value}
                  min={TARGET_LIMITS[f.key].min}
                  max={TARGET_LIMITS[f.key].max}
                  step={f.step}
                  onChange={(e) => set(f.key, e.target.value)}
                  aria-label={f.label}
                  className="w-32 rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-right text-sm outline-none focus:border-border-strong"
                />
                {f.suffix && <span className="text-sm text-fg-muted">{f.suffix}</span>}
              </label>
            )}
          </div>
        );
      })}

      <Button variant="primary" block onClick={onSave} disabled={saved} loading={saving}>
        {saving ? "Saving…" : saved ? "Targets saved" : "Save targets"}
      </Button>
    </div>
  );
}

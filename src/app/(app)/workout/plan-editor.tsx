"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { WEEKDAYS } from "@/lib/dates";
import type { WorkoutPlanDay } from "@/lib/types";
import { saveWorkoutPlanDay, type LogResult } from "./actions";

/*
  The 7-day split, editable in place.

  A row shows the day's label and focus; tapping it opens two inputs and a Save.
  One day is edited at a time — the whole plan is seven upserts either way, and
  editing one row at a time keeps the panel readable on a phone.

  Days the user never set show as "Not set" and write on first save, because
  `workout_plan_days` is `unique (user_id, weekday)` and the action upserts.
*/

const INITIAL: LogResult = { ok: false, error: null };

const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-card-hover/60 px-2.5 py-1.5 text-sm text-fg " +
  "outline-none transition-colors hover:border-border-strong focus:border-border-strong";

export function PlanEditor({ plan, todayWeekday }: { plan: WorkoutPlanDay[]; todayWeekday: number }) {
  const [editing, setEditing] = useState<number | null>(null);
  // The toast + close live in the action rather than an effect on `state`: an
  // effect fires an extra render for every result and re-fires on an identical
  // one (save the same day twice and the row would never close).
  const [, action, pending] = useActionState(async (prev: LogResult, formData: FormData) => {
    const res = await saveWorkoutPlanDay(prev, formData);
    if (res.ok) {
      toast.success("Plan updated ✓");
      setEditing(null);
    } else if (res.error) {
      toast.error(res.error);
    }
    return res;
  }, INITIAL);

  const byWeekday = new Map(plan.map((d) => [d.weekday, d]));

  return (
    <ul className="space-y-2">
      {WEEKDAYS.map((name, weekday) => {
        const day = byWeekday.get(weekday);
        const isToday = weekday === todayWeekday;

        if (editing === weekday) {
          return (
            <li key={weekday}>
              <form action={action} className="space-y-2 rounded-xl border border-border-strong p-3">
                <input type="hidden" name="weekday" value={weekday} />
                <div className="flex items-center gap-2">
                  <span className="w-9 shrink-0 text-sm font-medium">{name}</span>
                  <input
                    name="label"
                    defaultValue={day?.label ?? ""}
                    placeholder="Push · Legs · Rest"
                    aria-label={`${name} session name`}
                    maxLength={40}
                    autoFocus
                    className={inputCls}
                  />
                </div>
                <input
                  name="focus"
                  defaultValue={day?.focus ?? ""}
                  placeholder="What it covers (optional)"
                  aria-label={`${name} focus`}
                  maxLength={80}
                  className={inputCls}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg border border-border bg-card-solid px-3 py-1.5 text-sm font-medium transition-colors hover:border-border-strong hover:bg-card-hover disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    disabled={pending}
                    className="rounded-lg px-3 py-1.5 text-sm text-fg-secondary transition-colors hover:text-fg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </li>
          );
        }

        return (
          <li key={weekday}>
            <button
              type="button"
              onClick={() => setEditing(weekday)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:border-border-strong hover:bg-card-hover/60 ${
                isToday ? "border-border-strong bg-card-hover/40" : "border-border"
              }`}
            >
              <span className="w-9 shrink-0 font-medium">{name}</span>
              <span className="min-w-0 flex-1 truncate text-fg-secondary">
                {day?.label ?? <span className="text-fg-muted">Not set</span>}
                {day?.focus && <span className="text-fg-muted"> · {day.focus}</span>}
              </span>
              <Icon name="Pencil" size={13} className="shrink-0 text-fg-muted" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

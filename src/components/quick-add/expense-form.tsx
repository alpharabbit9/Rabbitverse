"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";

type LogResult = { ok: boolean; error: string | null };
type Cat = { id: string; name: string; color: string; icon: string };

const INITIAL: LogResult = { ok: false, error: null };

export function ExpenseForm({
  categories,
  today,
  yesterday,
  action,
}: {
  categories: Cat[];
  today: string;
  yesterday: string;
  action: (prev: LogResult, fd: FormData) => Promise<LogResult>;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Expense logged ✓");
      ref.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Amount (৳)</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">৳</span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            required
            placeholder="450"
            className="w-full rounded-xl border border-border bg-card-hover/60 py-2.5 pl-7 pr-3 text-sm outline-none transition-colors focus:border-border-strong"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Category</label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c, i) => (
            <label key={c.id} className="cursor-pointer">
              <input type="radio" name="category_id" value={c.id} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-2 py-2 text-xs transition-colors peer-checked:border-border-strong peer-checked:bg-card-hover">
                <Icon name={c.icon} size={14} style={{ color: c.color }} />
                {c.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Date</label>
          <input
            name="spent_at"
            type="date"
            min={yesterday}
            max={today}
            defaultValue={today}
            className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Note (optional)</label>
          <input
            name="note"
            type="text"
            maxLength={200}
            placeholder="Lunch & coffee"
            className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        <Icon name="Plus" size={16} />
        {pending ? "Saving…" : "Log expense"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { useCurrencySymbol } from "@/components/locale-provider";

type LogResult = { ok: boolean; error: string | null };
type Cat = { id: string; name: string; color: string; icon: string };

/** Prefill for edit mode — the row being corrected. */
export type ExpenseInitial = { id: string; amount: number; categoryId: string; note?: string; spentAt: string };

const INITIAL: LogResult = { ok: false, error: null };

export function ExpenseForm({
  categories,
  today,
  yesterday,
  action,
  mode = "create",
  initial,
  onDone,
}: {
  categories: Cat[];
  today: string;
  yesterday: string;
  action: (prev: LogResult, fd: FormData) => Promise<LogResult>;
  /** "create" is the logging form; "edit" corrects an existing row (Phase F). */
  mode?: "create" | "edit";
  initial?: ExpenseInitial;
  /** Called after a successful edit, to close the inline editor. */
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const symbol = useCurrencySymbol();
  const ref = useRef<HTMLFormElement>(null);
  const editing = mode === "edit";

  useEffect(() => {
    if (state.ok) {
      if (editing) {
        toast.success("Expense updated ✓");
        onDone?.();
      } else {
        toast.success("Expense logged ✓");
        ref.current?.reset();
      }
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, editing, onDone]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      {editing && initial && <input type="hidden" name="id" value={initial.id} />}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Amount ({symbol})</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">{symbol}</span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            required
            defaultValue={initial?.amount}
            placeholder="450"
            className="w-full rounded-xl border border-border bg-card-hover/60 py-2.5 pl-7 pr-3 text-sm outline-none transition-colors focus:border-border-strong"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Category</label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c, i) => (
            // A radio wearing the button's glass — see the same pattern in
            // `quick-add-hub.tsx`.
            <label key={c.id} className="rv-btn cursor-pointer [--rv-pad:3px]">
              <input
                type="radio"
                name="category_id"
                value={c.id}
                defaultChecked={initial ? c.id === initial.categoryId : i === 0}
                className="peer sr-only"
              />
              <span className="rv-btn-face gap-1.5 px-2 py-2 text-xs peer-checked:border-border-strong peer-checked:bg-card-hover peer-checked:text-fg">
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
            // Logging is fenced to yesterday+today; editing may reach any past date.
            min={editing ? undefined : yesterday}
            max={today}
            defaultValue={initial?.spentAt ?? today}
            className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Note (optional)</label>
          <input
            name="note"
            type="text"
            maxLength={200}
            defaultValue={initial?.note}
            placeholder="Lunch & coffee"
            className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {editing && (
          <Button size="lg" onClick={() => onDone?.()} faceClassName="py-3">
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="lg" loading={pending} className="flex-1" faceClassName="py-3">
          <Icon name={editing ? "Check" : "Plus"} size={16} />
          {pending ? "Saving…" : editing ? "Save changes" : "Log expense"}
        </Button>
      </div>
    </form>
  );
}

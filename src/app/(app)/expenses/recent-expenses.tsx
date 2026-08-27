"use client";

/*
  The "Recent" expenses list, now editable (V3.0 Phase F). Each row carries a ⋯
  menu: Edit swaps the row for an inline `ExpenseForm` in edit mode; Delete is
  optimistic + undoable (the server delete only fires once the Undo window
  lapses). Read-only lists elsewhere are unaffected — this is signed-in only.
*/

import { useCallback, useState } from "react";
import { shortDate } from "@/lib/dates";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { Icon } from "@/components/icon";
import { useMoney } from "@/components/locale-provider";
import { RowMenu } from "@/components/ui/row-menu";
import { useUndoableDelete } from "@/components/ui/use-undoable-delete";
import { ExpenseForm } from "@/components/quick-add/expense-form";
import { deleteExpense, updateExpense } from "./actions";

export function RecentExpenses({
  expenses,
  categories,
  today,
  yesterday,
}: {
  expenses: Expense[];
  categories: ExpenseCategory[];
  today: string;
  yesterday: string;
}) {
  const money = useMoney();
  const [editing, setEditing] = useState<string | null>(null);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const commit = useCallback((id: string) => {
    const fd = new FormData();
    fd.set("id", id);
    return deleteExpense({ ok: false, error: null }, fd);
  }, []);
  const { hidden, remove } = useUndoableDelete(commit, { label: "Expense deleted" });

  const visible = expenses.filter((e) => !hidden.has(e.id));

  if (!visible.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
        Nothing logged yet — add your first expense on the left. 🐇
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {visible.map((e) => {
        const c = e.categoryId ? catMap.get(e.categoryId) : undefined;

        if (editing === e.id) {
          return (
            <li key={e.id} className="rounded-xl border border-border-strong bg-card-hover/30 p-3">
              <ExpenseForm
                categories={categories}
                today={today}
                yesterday={yesterday}
                action={updateExpense}
                mode="edit"
                initial={{ id: e.id, amount: e.amount, categoryId: e.categoryId, note: e.note, spentAt: e.date }}
                onDone={() => setEditing(null)}
              />
            </li>
          );
        }

        return (
          <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2.5 text-sm">
              <Icon name={c?.icon ?? "Wallet"} size={16} style={{ color: c?.color ?? "var(--accent-mint)" }} />
              <span className="min-w-0">
                <span className="font-medium">{c?.name ?? "Expense"}</span>
                {e.note ? <span className="text-fg-muted"> · {e.note}</span> : null}
                <span className="block text-xs text-fg-muted">{shortDate(e.date)}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="font-semibold tabular-nums">{money(e.amount)}</span>
              <RowMenu onEdit={() => setEditing(e.id)} onDelete={() => remove(e.id)} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

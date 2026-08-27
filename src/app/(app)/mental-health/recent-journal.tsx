"use client";

/*
  The "Recent Journal" list, now editable (V3.0 Phase F). When signed in, each
  entry carries a ⋯ menu: Edit swaps it for a `JournalForm` in edit mode (mood +
  text; the date is fixed once an entry exists); Delete is optimistic + undoable.
  Read-only in demo.
*/

import { useCallback, useState } from "react";
import { shortDate } from "@/lib/dates";
import type { JournalEntry } from "@/lib/types";
import { RowMenu } from "@/components/ui/row-menu";
import { useUndoableDelete } from "@/components/ui/use-undoable-delete";
import { JournalForm } from "./journal-form";
import { deleteJournalEntry, updateJournalEntry } from "./actions";

const MOOD_FACE = ["", "😔", "😕", "😐", "🙂", "😄"];

export function RecentJournal({
  entries,
  today,
  yesterday,
  canLog,
}: {
  entries: JournalEntry[];
  today: string;
  yesterday: string;
  canLog: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const commit = useCallback((id: string) => {
    const fd = new FormData();
    fd.set("id", id);
    return deleteJournalEntry({ ok: false, error: null }, fd);
  }, []);
  const { hidden, remove } = useUndoableDelete(commit, { label: "Reflection deleted" });

  const visible = entries.filter((j) => !hidden.has(j.id));
  if (!visible.length) return <p className="py-6 text-center text-sm text-fg-muted">No entries yet.</p>;

  return (
    <ul className="space-y-3">
      {visible.map((j) => {
        if (canLog && editing === j.id) {
          return (
            <li key={j.id} className="rounded-xl border border-border-strong bg-card-hover/30 p-3">
              <JournalForm
                today={today}
                yesterday={yesterday}
                action={updateJournalEntry}
                mode="edit"
                initial={{ id: j.id, mood: j.mood, body: j.body }}
                onDone={() => setEditing(null)}
              />
            </li>
          );
        }
        return (
          <li key={j.id} className="rounded-xl border border-border p-3">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-fg-muted">
              <span>{shortDate(j.date)}</span>
              <span className="flex items-center gap-1">
                <span className="text-base">{MOOD_FACE[j.mood]}</span>
                {canLog && <RowMenu onEdit={() => setEditing(j.id)} onDelete={() => remove(j.id)} />}
              </span>
            </div>
            {j.body ? (
              <p className="line-clamp-2 text-sm text-fg-secondary">{j.body}</p>
            ) : (
              <p className="text-sm text-fg-muted">Mood {j.mood}/5</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { saveJournal, type LogResult } from "./actions";

const INITIAL: LogResult = { ok: false, error: null };
const FACES: { value: number; face: string; label: string }[] = [
  { value: 1, face: "😔", label: "Rough" },
  { value: 2, face: "😕", label: "Low" },
  { value: 3, face: "😐", label: "Okay" },
  { value: 4, face: "🙂", label: "Good" },
  { value: 5, face: "😄", label: "Great" },
];

/** Prefill for edit mode — the reflection being corrected. */
export type JournalInitial = { id: string; mood: number; body: string };

export function JournalForm({
  today,
  yesterday,
  action = saveJournal,
  mode = "create",
  initial,
  onDone,
}: {
  today: string;
  yesterday: string;
  action?: (prev: LogResult, fd: FormData) => Promise<LogResult>;
  /** "create" is the daily form; "edit" corrects an existing entry (Phase F). */
  mode?: "create" | "edit";
  initial?: JournalInitial;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const ref = useRef<HTMLFormElement>(null);
  const editing = mode === "edit";

  useEffect(() => {
    if (state.ok) {
      if (editing) {
        toast.success("Reflection updated ✓");
        onDone?.();
      } else {
        toast.success("Reflection saved ✓");
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
        <span className="mb-2 block text-xs font-medium text-fg-secondary">How did today feel?</span>
        <div className="grid grid-cols-5 gap-2">
          {FACES.map((f, i) => (
            // A radio in the button's glass — same pattern as the expense form.
            <label key={f.value} className="rv-btn cursor-pointer [--rv-pad:3px] [--rv-hue:31]">
              <input
                type="radio"
                name="mood"
                value={f.value}
                defaultChecked={initial ? f.value === initial.mood : i === 3}
                className="peer sr-only"
              />
              <span className="rv-btn-face flex-col gap-1 px-1 py-2 peer-checked:border-border-strong peer-checked:bg-card-hover">
                <span className="text-xl">{f.face}</span>
                <span className="text-[10px] text-fg-muted">{f.label}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <textarea
        name="body"
        rows={3}
        maxLength={2000}
        defaultValue={initial?.body}
        placeholder="Write today's reflection… what happened, how you felt, what you're grateful for."
        className="w-full resize-none rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
      />

      <div className="flex items-center gap-2">
        {/* The date is fixed once an entry exists (one row per day), so edit mode
            drops the picker and just saves mood + body back. */}
        {editing ? (
          <Button onClick={() => onDone?.()}>Cancel</Button>
        ) : (
          <select
            name="entry_date"
            defaultValue={today}
            className="rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
          >
            <option value={today}>Today</option>
            <option value={yesterday}>Yesterday</option>
          </select>
        )}
        <Button type="submit" variant="primary" hue="orange" loading={pending} className="flex-1">
          {editing && <Icon name="Check" size={16} />}
          {pending ? "Saving…" : editing ? "Save changes" : "Save reflection"}
        </Button>
      </div>
    </form>
  );
}

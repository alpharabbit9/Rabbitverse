"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { saveJournal, type LogResult } from "./actions";

const INITIAL: LogResult = { ok: false, error: null };
const FACES: { value: number; face: string; label: string }[] = [
  { value: 1, face: "😔", label: "Rough" },
  { value: 2, face: "😕", label: "Low" },
  { value: 3, face: "😐", label: "Okay" },
  { value: 4, face: "🙂", label: "Good" },
  { value: 5, face: "😄", label: "Great" },
];

export function JournalForm({ today, yesterday }: { today: string; yesterday: string }) {
  const [state, action, pending] = useActionState(saveJournal, INITIAL);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Reflection saved ✓");
      ref.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      <div>
        <span className="mb-2 block text-xs font-medium text-fg-secondary">How did today feel?</span>
        <div className="grid grid-cols-5 gap-2">
          {FACES.map((f, i) => (
            <label key={f.value} className="cursor-pointer">
              <input type="radio" name="mood" value={f.value} defaultChecked={i === 3} className="peer sr-only" />
              <span className="flex flex-col items-center gap-1 rounded-xl border border-border px-1 py-2 transition-colors peer-checked:border-border-strong peer-checked:bg-card-hover">
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
        placeholder="Write today's reflection… what happened, how you felt, what you're grateful for."
        className="w-full resize-none rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
      />

      <div className="flex items-center gap-2">
        <select
          name="entry_date"
          defaultValue={today}
          className="rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
        >
          <option value={today}>Today</option>
          <option value={yesterday}>Yesterday</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-gradient-to-r from-accent-orange to-accent-gold px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save reflection"}
        </button>
      </div>
    </form>
  );
}

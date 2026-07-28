"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { logWeight, setTodayWorkout, type LogResult } from "./actions";

const INITIAL: LogResult = { ok: false, error: null };

/** "Did you train today?" — one tap marks done or rest for today's plan. */
export function TodayWorkoutForm({
  planLabel,
  status,
}: {
  planLabel: string;
  status: "done" | "rest" | null;
}) {
  const [state, action, pending] = useActionState(setTodayWorkout, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) toast.success("Today updated ✓");
    else if (state.error) toast.error(state.error);
  }, [state]);

  const submit = (done: boolean) => {
    if (doneRef.current) doneRef.current.value = String(done);
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={action} className="space-y-2.5">
      <input type="hidden" name="plan_label" value={planLabel} />
      <input ref={doneRef} type="hidden" name="done" value="true" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        >
          <Icon name="Check" size={16} />
          Mark {planLabel || "workout"} done
        </button>
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={pending}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg disabled:opacity-60"
        >
          Rest
        </button>
      </div>
      {status && (
        <p className="text-xs text-fg-muted">
          {status === "done" ? (
            <span className="text-accent-mint">✓ Logged as done today.</span>
          ) : (
            <span>Marked as rest today.</span>
          )}
        </p>
      )}
    </form>
  );
}

/** Log today's weight (+ optional body-fat %). */
export function WeightForm({ latestWeight }: { latestWeight?: number }) {
  const [state, action, pending] = useActionState(logWeight, INITIAL);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Weight logged ✓");
      ref.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2">
      <label className="flex-1">
        <span className="mb-1 block text-xs text-fg-secondary">Weight (kg)</span>
        <input
          name="weight"
          type="number"
          step="0.1"
          min="1"
          required
          placeholder={latestWeight ? String(latestWeight) : "78.5"}
          className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
        />
      </label>
      <label className="flex-1">
        <span className="mb-1 block text-xs text-fg-secondary">Body fat % (optional)</span>
        <input
          name="body_fat"
          type="number"
          step="0.1"
          min="1"
          placeholder="18"
          className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log"}
      </button>
    </form>
  );
}

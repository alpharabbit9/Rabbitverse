"use client";

import { useActionState, useEffect, useOptimistic, useRef } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { logWeight, saveHeight, setWorkoutDay, type LogResult } from "./actions";

const INITIAL: LogResult = { ok: false, error: null };

/** "Did you train today?" — one tap marks done or rest for today's plan. */
export function TodayWorkoutForm({
  planLabel,
  status,
}: {
  planLabel: string;
  status: "done" | "rest" | null;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [state, action, pending] = useActionState(setWorkoutDay, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) toast.success("Today updated ✓");
    else if (state.error) toast.error(state.error);
  }, [state]);

  const handleAction = (formData: FormData) => {
    const done = formData.get("done") === "true";
    setOptimisticStatus(done ? "done" : "rest");
    action(formData);
  };

  const submit = (done: boolean) => {
    if (doneRef.current) doneRef.current.value = String(done);
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={handleAction} className="space-y-2.5">
      <input type="hidden" name="plan_label" value={planLabel} />
      <input ref={doneRef} type="hidden" name="done" value="true" />
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => submit(true)} loading={pending} className="flex-1">
          <Icon name="Check" size={16} />
          Mark {planLabel || "workout"} done
        </Button>
        <Button onClick={() => submit(false)} disabled={pending}>
          Rest
        </Button>
      </div>
      {optimisticStatus && (
        <p className="text-xs text-fg-muted">
          {optimisticStatus === "done" ? (
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
      <Button type="submit" variant="primary" loading={pending}>
        {pending ? "Saving…" : "Log"}
      </Button>
    </form>
  );
}

/** Set the profile height (cm) once — this is what unlocks the BMI number. */
export function HeightForm({ heightCm }: { heightCm: number | null }) {
  const [state, action, pending] = useActionState(saveHeight, INITIAL);

  useEffect(() => {
    if (state.ok) toast.success("Height saved ✓");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="flex-1">
        <span className="mb-1 block text-xs text-fg-secondary">Height (cm)</span>
        <input
          name="height"
          type="number"
          step="0.1"
          min="50"
          max="260"
          required
          defaultValue={heightCm ?? ""}
          placeholder="175"
          className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
        />
      </label>
      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : heightCm ? "Update" : "Save"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { createProject, logProgress, type LogResult } from "./actions";

const INITIAL: LogResult = { ok: false, error: null };

/** Inline "create a project" form that expands from a button. */
export function NewProjectForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createProject, INITIAL);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Project created ✓");
      ref.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const close = () => setOpen(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="glass flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
      >
        <Icon name="Plus" size={16} />
        New project
      </button>
    );
  }

  return (
    <form ref={ref} action={action} className="glass space-y-3 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">New project</span>
        <button type="button" onClick={close} className="text-fg-muted hover:text-fg">
          <Icon name="X" size={16} />
        </button>
      </div>
      <input
        name="name"
        required
        placeholder="Project name (e.g. Read 20 books)"
        className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="target_value"
          type="number"
          min="1"
          step="any"
          required
          placeholder="Target (e.g. 20)"
          className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
        />
        <input
          name="target_unit"
          defaultValue="%"
          placeholder="Unit (%, books…)"
          className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
        />
      </div>
      <input
        name="description"
        placeholder="Short description (optional)"
        className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none focus:border-border-strong"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}

/** Per-project "log progress" row: quick-set chips + amount + Log. */
export function ProgressLogger({ projectId, unit }: { projectId: string; unit: string }) {
  const [state, action, pending] = useActionState(logProgress, INITIAL);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Progress logged ✓");
      if (inputRef.current) inputRef.current.value = "";
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const quick = unit === "%" ? [5, 10, 25] : [1, 5, 10];

  return (
    <form action={action} className="mt-3 flex items-center gap-1.5">
      <input type="hidden" name="project_id" value={projectId} />
      {quick.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = String(q);
          }}
          className="rounded-lg border border-border px-2 py-1 text-xs text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
        >
          +{q}
        </button>
      ))}
      <input
        ref={inputRef}
        name="amount"
        type="number"
        step="any"
        placeholder={unit === "%" ? "%" : unit}
        className="w-16 rounded-lg border border-border bg-card-hover/60 px-2 py-1 text-xs outline-none focus:border-border-strong"
      />
      <button
        type="submit"
        disabled={pending}
        aria-label="Log progress"
        className="rounded-lg bg-gradient-to-r from-accent-blue to-accent-cyan px-2.5 py-1 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "…" : "Log"}
      </button>
    </form>
  );
}

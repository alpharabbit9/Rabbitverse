"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import type { ProjectTask } from "@/lib/types";
import { addCommit, addTask, createProject, deleteTask, toggleTask, type LogResult } from "./actions";

const INITIAL: LogResult = { ok: false, error: null };

const inputCls =
  "w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-border-strong";

/** Inline "create a project" form that expands from a button. */
export function NewProjectForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createProject, INITIAL);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Project created ✓ — open it to add tasks");
      ref.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="glass flex min-h-[7rem] items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
      >
        <Icon name="Plus" size={16} />
        New project
      </button>
    );
  }

  return (
    <form ref={ref} action={action} className="glass space-y-3 rounded-2xl p-5 sm:col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">New project</span>
        <button type="button" onClick={() => setOpen(false)} className="text-fg-muted hover:text-fg" aria-label="Close">
          <Icon name="X" size={16} />
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Project name</label>
        <input name="name" required maxLength={120} placeholder="e.g. Learn Spanish" className={inputCls} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">My goal / why it matters</label>
        <textarea
          name="goals"
          rows={2}
          maxLength={2000}
          placeholder="What are you aiming for, and why does it matter to you?"
          className={`${inputCls} resize-none`}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Short description (optional)</label>
        <input name="description" maxLength={300} placeholder="A one-liner for the card" className={inputCls} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Aimed finish date (optional)</label>
        <input name="target_date" type="date" className={inputCls} />
      </div>

      <p className="text-xs text-fg-muted">
        You&apos;ll add tasks and log progress on the project page. Start date is set to today.
      </p>

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

/** Add a task to a project's checklist. */
export function TaskAdder({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(addTask, INITIAL);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      if (inputRef.current) inputRef.current.value = "";
      inputRef.current?.focus();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={action} className="mt-3 flex items-center gap-2">
      <input type="hidden" name="project_id" value={projectId} />
      <input
        ref={inputRef}
        name="title"
        maxLength={200}
        placeholder="Add a task or milestone…"
        className={`${inputCls} py-2`}
      />
      <button
        type="submit"
        disabled={pending}
        aria-label="Add task"
        className="shrink-0 rounded-xl bg-card-hover px-3 py-2 text-fg-secondary transition-colors hover:text-fg disabled:opacity-60"
      >
        <Icon name="Plus" size={16} />
      </button>
    </form>
  );
}

/** A single checklist row: tap to toggle done, × to remove. Read-only in demo. */
export function TaskRow({ task, canLog = false }: { task: ProjectTask; canLog?: boolean }) {
  const [, toggleAction, togglePending] = useActionState(toggleTask, INITIAL);
  const [delState, deleteAction] = useActionState(deleteTask, INITIAL);

  useEffect(() => {
    if (delState.error) toast.error(delState.error);
  }, [delState]);

  if (!canLog) {
    return (
      <li className="flex items-center gap-2.5">
        {task.done ? (
          <Icon name="CheckCircle2" size={20} style={{ color: "var(--accent-mint)" }} />
        ) : (
          <span className="block size-5 shrink-0 rounded-full border-2 border-border" />
        )}
        <span className={`truncate text-sm ${task.done ? "text-fg-muted line-through" : "text-fg"}`}>{task.title}</span>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-2.5">
      <form action={toggleAction} className="flex min-w-0 flex-1 items-center gap-2.5">
        <input type="hidden" name="task_id" value={task.id} />
        <input type="hidden" name="done" value={String(!task.done)} />
        <button
          type="submit"
          disabled={togglePending}
          aria-label={task.done ? "Mark not done" : "Mark done"}
          className="shrink-0"
        >
          {task.done ? (
            <Icon name="CheckCircle2" size={20} style={{ color: "var(--accent-mint)" }} />
          ) : (
            <span className="block size-5 rounded-full border-2 border-border transition-colors group-hover:border-border-strong" />
          )}
        </button>
        <span className={`truncate text-sm ${task.done ? "text-fg-muted line-through" : "text-fg"}`}>{task.title}</span>
      </form>
      <form action={deleteAction} className="shrink-0">
        <input type="hidden" name="task_id" value={task.id} />
        <button
          type="submit"
          aria-label="Delete task"
          className="text-fg-muted opacity-0 transition-opacity hover:text-accent-orange group-hover:opacity-100"
        >
          <Icon name="X" size={15} />
        </button>
      </form>
    </li>
  );
}

/** Write a dated progress update (a "commit"). */
export function CommitComposer({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(addCommit, INITIAL);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Update logged ✓");
      ref.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-2.5">
      <input type="hidden" name="project_id" value={projectId} />
      <textarea
        name="note"
        rows={3}
        required
        maxLength={2000}
        placeholder="What did you get done today? This is logged as a dated update."
        className={`${inputCls} resize-none`}
      />
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        <Icon name="PenLine" size={16} />
        {pending ? "Logging…" : "Log today's update"}
      </button>
    </form>
  );
}

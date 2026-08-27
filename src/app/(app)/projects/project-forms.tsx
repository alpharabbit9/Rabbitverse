"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { shortDate } from "@/lib/dates";
import type { Project, ProjectCommit, ProjectTask } from "@/lib/types";
import { RowMenu } from "@/components/ui/row-menu";
import { useUndoableDelete } from "@/components/ui/use-undoable-delete";
import {
  addCommit,
  addTask,
  createProject,
  deleteCommit,
  deleteProject,
  deleteTask,
  renameProject,
  toggleTask,
  updateCommit,
  type LogResult,
} from "./actions";

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

/**
 * Write a dated progress update (a "commit"). Defaults to today but can be
 * filed against yesterday — writing up last night's work this morning is the
 * common case, and the action honours the same window as every other log.
 */
export function CommitComposer({ projectId, today, yesterday }: { projectId: string; today: string; yesterday: string }) {
  const [state, action, pending] = useActionState(addCommit, INITIAL);
  const [day, setDay] = useState(today);
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
      <input type="hidden" name="log_date" value={day} />
      <textarea
        name="note"
        rows={3}
        required
        maxLength={2000}
        placeholder={day === today ? "What did you get done today? This is logged as a dated update." : "What did you get done yesterday?"}
        className={`${inputCls} resize-none`}
      />
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: today, label: "Today" },
          { v: yesterday, label: "Yesterday" },
        ].map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setDay(o.v)}
            aria-pressed={day === o.v}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              day === o.v ? "border-border-strong bg-card-hover text-fg" : "border-border text-fg-secondary hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        <Icon name="PenLine" size={16} />
        {pending ? "Logging…" : `Log ${day === today ? "today" : "yesterday"}'s update`}
      </button>
    </form>
  );
}

/**
 * The dated update ("commit") timeline. Signed-in each entry carries a ⋯ menu:
 * Edit rewrites the note inline; Delete is optimistic + undoable (deleting an
 * update drops that day from "days worked" and the heatmap). Read-only in demo.
 */
export function CommitTimeline({
  commits,
  projectId,
  canLog = false,
}: {
  commits: ProjectCommit[];
  projectId: string;
  canLog?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const commit = useCallback(
    (id: string) => {
      const fd = new FormData();
      fd.set("log_id", id);
      fd.set("project_id", projectId);
      return deleteCommit(INITIAL, fd);
    },
    [projectId],
  );
  const { hidden, remove } = useUndoableDelete(commit, { label: "Update deleted" });

  const visible = commits.filter((c) => !hidden.has(c.id));
  if (!visible.length) {
    return (
      <p className="text-sm text-fg-muted">
        {canLog ? "No updates yet — log your first one above. Each update counts as a day worked." : "No updates logged yet."}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {visible.map((c) => (
        <li key={c.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-card-hover">
              <Icon name="PenLine" size={12} style={{ color: "var(--accent-blue)" }} />
            </span>
            <span className="mt-1 w-px flex-1 bg-border" />
          </div>
          <div className="min-w-0 flex-1 pb-1">
            {canLog && editing === c.id ? (
              <CommitEditor logId={c.id} projectId={projectId} note={c.note} onDone={() => setEditing(null)} />
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-fg-muted">{shortDate(c.date)}</div>
                  {canLog && <RowMenu onEdit={() => setEditing(c.id)} onDelete={() => remove(c.id)} />}
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm text-fg">{c.note}</p>
              </>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Inline editor for one update's text. */
function CommitEditor({
  logId,
  projectId,
  note,
  onDone,
}: {
  logId: string;
  projectId: string;
  note: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(updateCommit, INITIAL);

  useEffect(() => {
    if (state.ok) {
      toast.success("Update saved ✓");
      onDone();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="log_id" value={logId} />
      <input type="hidden" name="project_id" value={projectId} />
      <textarea name="note" rows={3} required maxLength={2000} defaultValue={note} className={`${inputCls} resize-none`} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan px-3 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
        >
          <Icon name="Check" size={14} />
          {pending ? "Saving…" : "Save update"}
        </button>
      </div>
    </form>
  );
}

/**
 * Project-level Edit / Delete (Phase F). A ⋯ menu opens an inline "Edit project"
 * form (rename + why-it-matters + finish date) or, on a confirmed second tap,
 * deletes the whole project — its updates and checklist cascade — and returns to
 * /projects. Signed-in only; the detail view renders it only when `canLog`.
 */
export function ProjectSettings({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  const del = () => {
    const fd = new FormData();
    fd.set("project_id", project.id);
    startTransition(async () => {
      const res = await deleteProject(INITIAL, fd);
      // On success `deleteProject` redirects, so we only reach here on failure.
      if (!res.ok) toast.error(res.error ?? "Couldn't delete the project.");
    });
  };

  if (editing) return <ProjectRenameForm project={project} onDone={() => setEditing(false)} />;

  return (
    <div className="flex justify-end">
      <RowMenu
        onEdit={() => setEditing(true)}
        onDelete={del}
        editLabel="Edit details"
        deleteLabel="Delete project"
        label="Project actions"
      />
    </div>
  );
}

function ProjectRenameForm({ project, onDone }: { project: Project; onDone: () => void }) {
  const [state, action, pending] = useActionState(renameProject, INITIAL);

  useEffect(() => {
    if (state.ok) {
      toast.success("Project updated ✓");
      onDone();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onDone]);

  return (
    <form action={action} className="glass space-y-3 rounded-2xl p-4">
      <input type="hidden" name="project_id" value={project.id} />
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Edit project</span>
        <button type="button" onClick={onDone} className="text-fg-muted hover:text-fg" aria-label="Close">
          <Icon name="X" size={16} />
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Project name</label>
        <input name="name" required maxLength={120} defaultValue={project.name} className={inputCls} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Why it matters</label>
        <textarea name="goals" rows={2} maxLength={2000} defaultValue={project.goals ?? ""} className={`${inputCls} resize-none`} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Aimed finish date (optional)</label>
        <input name="target_date" type="date" defaultValue={project.targetDate ?? ""} className={inputCls} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

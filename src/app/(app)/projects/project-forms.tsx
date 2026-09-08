"use client";

import { useActionState, useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { shortDate } from "@/lib/dates";
import type { Project, ProjectCommit, ProjectTask } from "@/lib/types";
import type { HueName } from "@/lib/hues";
import { MAX_PROJECT_TAGS, PROJECT_PRESET_TAGS } from "@/lib/project-tags";
import { Button } from "@/components/ui/button";
import { GenerateButton } from "@/components/ui/generate-button";
import { RowMenu } from "@/components/ui/row-menu";
import { useUndoableDelete } from "@/components/ui/use-undoable-delete";
import {
  addCommit,
  addTask,
  deleteCommit,
  deleteProject,
  deleteTask,
  renameProject,
  setProjectStatus,
  toggleTask,
  updateCommit,
  updateProjectTags,
  type LogResult,
} from "./actions";
import {
  generateMilestones,
  applyMilestones,
  scanUpdateForMilestones,
  completeMilestones,
  type GenerateResponse,
  type ScanResponse,
} from "./ai-actions";

const INITIAL: LogResult = { ok: false, error: null };

const inputCls =
  "w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-border-strong";

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
      <Button type="submit" size="icon" hue="blue" disabled={pending} aria-label="Add task">
        <Icon name="Plus" size={16} />
      </Button>
    </form>
  );
}

/** A single checklist row: tap to toggle done, × to remove. Read-only in demo. */
export function TaskRow({ task, canLog = false }: { task: ProjectTask; canLog?: boolean }) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(task.done);
  const [, toggleAction, togglePending] = useActionState(toggleTask, INITIAL);
  const [delState, deleteAction] = useActionState(deleteTask, INITIAL);

  useEffect(() => {
    if (delState.error) toast.error(delState.error);
  }, [delState]);

  if (!canLog) {
    return (
      <li className="flex items-center gap-2.5">
        {optimisticDone ? (
          <Icon name="CheckCircle2" size={20} style={{ color: "var(--accent-mint)" }} />
        ) : (
          <span className="block size-5 shrink-0 rounded-full border-2 border-border" />
        )}
        <span className={`truncate text-sm ${optimisticDone ? "text-fg-muted line-through" : "text-fg"}`}>{task.title}</span>
      </li>
    );
  }

  const handleToggle = (formData: FormData) => {
    setOptimisticDone(!task.done);
    toggleAction(formData);
  };

  return (
    <li className="group flex items-center gap-2.5">
      <form action={handleToggle} className="flex min-w-0 flex-1 items-center gap-2.5">
        <input type="hidden" name="task_id" value={task.id} />
        <input type="hidden" name="done" value={String(!task.done)} />
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          hue="mint"
          disabled={togglePending}
          aria-label={optimisticDone ? "Mark not done" : "Mark done"}
        >
          {optimisticDone ? (
            <Icon name="CheckCircle2" size={20} style={{ color: "var(--accent-mint)" }} />
          ) : (
            <span className="block size-5 rounded-full border-2 border-border transition-colors group-hover:border-border-strong" />
          )}
        </Button>
        <span className={`truncate text-sm ${optimisticDone ? "text-fg-muted line-through" : "text-fg"}`}>{task.title}</span>
      </form>
      <form action={deleteAction} className="shrink-0">
        <input type="hidden" name="task_id" value={task.id} />
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          hue="rose"
          aria-label="Delete task"
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Icon name="X" size={15} />
        </Button>
      </form>
    </li>
  );
}

/**
 * Write a dated progress update (a "commit"). Defaults to today but can be
 * filed against yesterday — writing up last night's work this morning is the
 * common case, and the action honours the same window as every other log.
 */
export function CommitComposer({
  projectId,
  today,
  yesterday,
  hasOpenMilestones = false,
  aiReady = false,
}: {
  projectId: string;
  today: string;
  yesterday: string;
  hasOpenMilestones?: boolean;
  aiReady?: boolean;
}) {
  const [day, setDay] = useState(today);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  const [, action, pending] = useActionState(async (prev: LogResult, formData: FormData) => {
    const res = await addCommit(prev, formData);
    if (res.ok) {
      toast.success("Update logged ✓");
      ref.current?.reset();
      setNote("");
    } else if (res.error) {
      toast.error(res.error);
    }
    return res;
  }, INITIAL);

  return (
    <form ref={ref} action={action} className="space-y-2.5">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="log_date" value={day} />
      <textarea
        name="note"
        rows={3}
        required
        maxLength={2000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={day === today ? "What did you get done today? This is logged as a dated update." : "What did you get done yesterday?"}
        className={`${inputCls} resize-none`}
      />
      {hasOpenMilestones && (
        <CommitMilestoneMatcher
          projectId={projectId}
          note={note}
          hasOpenMilestones={hasOpenMilestones}
          aiReady={aiReady}
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: today, label: "Today" },
          { v: yesterday, label: "Yesterday" },
        ].map((o) => (
          <Button
            key={o.v}
            size="sm"
            hue="blue"
            block
            selected={day === o.v}
            onClick={() => setDay(o.v)}
            faceClassName="px-3 py-2 text-xs font-medium"
          >
            {o.label}
          </Button>
        ))}
      </div>
      <Button type="submit" variant="primary" hue="blue" block loading={pending}>
        <Icon name="PenLine" size={16} />
        {pending ? "Logging…" : `Log ${day === today ? "today" : "yesterday"}'s update`}
      </Button>
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
        <Button size="sm" onClick={onDone} faceClassName="px-3 py-2 text-xs font-medium">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          hue="blue"
          size="sm"
          loading={pending}
          className="flex-1"
          faceClassName="px-3 py-2 text-xs font-semibold"
        >
          <Icon name="Check" size={14} />
          {pending ? "Saving…" : "Save update"}
        </Button>
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
        <Button variant="ghost" size="icon-sm" hue="rose" onClick={onDone} aria-label="Close">
          <Icon name="X" size={16} />
        </Button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Project name</label>
        <input name="name" required maxLength={120} defaultValue={project.name} className={inputCls} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">The idea</label>
        <textarea name="goals" rows={3} maxLength={2000} defaultValue={project.goals ?? ""} className={`${inputCls} resize-none`} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-secondary">Aimed finish date (optional)</label>
        <input name="target_date" type="date" defaultValue={project.targetDate ?? ""} className={inputCls} />
      </div>

      <Button type="submit" variant="primary" hue="blue" block loading={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

// ---- Phase H: Status control ------------------------------------------------

const STATUS_OPTIONS: { value: Project["status"]; label: string; icon: string; accent: string; hue: HueName }[] = [
  { value: "planned", label: "Planned", icon: "Clock", accent: "var(--fg-muted)", hue: "blue" },
  { value: "ongoing", label: "In progress", icon: "Loader", accent: "var(--accent-blue)", hue: "blue" },
  { value: "completed", label: "Completed", icon: "CheckCircle2", accent: "var(--accent-mint)", hue: "mint" },
];

export function StatusControl({ project }: { project: Project }) {
  const [current, setCurrent] = useState(project.status);
  const [, startTransition] = useTransition();

  const change = (status: Project["status"]) => {
    setCurrent(status);
    const fd = new FormData();
    fd.set("project_id", project.id);
    fd.set("status", status);
    startTransition(async () => {
      const res = await setProjectStatus(INITIAL, fd);
      if (!res.ok) {
        setCurrent(project.status);
        toast.error(res.error ?? "Couldn't update status.");
      }
    });
  };

  return (
    <div className="flex gap-1.5">
      {STATUS_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          hue={opt.hue}
          selected={current === opt.value}
          onClick={() => change(opt.value)}
          faceClassName="gap-1.5 px-3 py-2 text-xs font-medium"
        >
          <Icon name={opt.icon} size={13} style={current === opt.value ? { color: opt.accent } : undefined} />
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

// ---- Phase H: Tag editor (detail view) --------------------------------------

export function TagEditor({ project }: { project: Project }) {
  const [tags, setTags] = useState<string[]>(project.tags ?? []);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  const save = (next: string[]) => {
    setTags(next);
    const fd = new FormData();
    fd.set("project_id", project.id);
    fd.set("tags", next.join(","));
    startTransition(async () => {
      const res = await updateProjectTags(INITIAL, fd);
      if (!res.ok) {
        setTags(project.tags ?? []);
        toast.error(res.error ?? "Couldn't update tags.");
      }
    });
  };

  const toggle = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag].slice(0, MAX_PROJECT_TAGS);
    save(next);
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="rounded-md bg-card-hover px-2 py-0.5 text-xs font-medium text-fg-secondary">
            {tag}
          </span>
        ))}
        <Button
          variant="ghost"
          size="sm"
          hue="cyan"
          onClick={() => setEditing(true)}
          className="[--rv-pad:2px]"
          faceClassName="gap-1 px-2 py-0.5 text-xs font-medium"
        >
          <Icon name="Plus" size={12} /> {tags.length ? "Edit" : "Add tags"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PROJECT_PRESET_TAGS.map((tag) => (
          <Button
            key={tag}
            size="sm"
            hue="cyan"
            selected={tags.includes(tag)}
            onClick={() => toggle(tag)}
            faceClassName="px-2 py-1 text-[11px] font-medium"
          >
            {tag}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" hue="cyan" onClick={() => setEditing(false)}>
        Done
      </Button>
    </div>
  );
}

// ---- Phase H: Milestone generator -------------------------------------------

export function MilestoneGenerator({
  projectId,
  hasIdea,
  aiReady,
}: {
  projectId: string;
  hasIdea: boolean;
  aiReady: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "review">("idle");
  const [suggestions, setSuggestions] = useState<{ title: string; detail: string }[]>([]);
  const [demo, setDemo] = useState(false);
  const [, startTransition] = useTransition();

  const generate = () => {
    setState("loading");
    startTransition(async () => {
      const res: GenerateResponse = await generateMilestones(projectId);
      if (res.ok && res.milestones.length) {
        setSuggestions(res.milestones.map((m) => ({ title: m.title, detail: m.detail ?? "" })));
        setDemo(res.demo);
        setState("review");
      } else {
        toast.error(res.error ?? "Couldn't generate milestones.");
        setState("idle");
      }
    });
  };

  const remove = (i: number) => {
    const next = suggestions.filter((_, j) => j !== i);
    if (!next.length) setState("idle");
    else setSuggestions(next);
  };

  const editTitle = (i: number, title: string) => {
    setSuggestions((prev) => prev.map((s, j) => (j === i ? { ...s, title } : s)));
  };

  const apply = () => {
    setState("loading");
    startTransition(async () => {
      const res = await applyMilestones(projectId, suggestions);
      if (res.ok) {
        toast.success(`${suggestions.length} milestone${suggestions.length === 1 ? "" : "s"} added`);
        setState("idle");
        setSuggestions([]);
      } else {
        toast.error(res.error ?? "Couldn't add milestones.");
        setState("review");
      }
    });
  };

  if (!hasIdea) {
    return (
      <p className="mt-3 text-xs text-fg-muted">
        Add a project idea (edit the project details) to generate milestones with AI.
      </p>
    );
  }

  if (state === "idle") {
    return (
      <div className="mt-3 flex items-center gap-2">
        <GenerateButton
          label="Generate milestones"
          activeLabel="Generating"
          onClick={generate}
          disabled={!aiReady && !hasIdea}
        />
        {!aiReady && <span className="text-[10px] text-fg-muted">(demo)</span>}
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-fg-secondary">
        <Icon name="Loader" size={16} className="animate-spin" />
        Thinking…
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2.5">
      {demo && <p className="text-[10px] text-fg-muted">Demo suggestions — sign in with a Groq key for AI-powered milestones.</p>}
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl border border-border bg-card-hover/40 p-3">
          <div className="min-w-0 flex-1">
            <input
              value={s.title}
              onChange={(e) => editTitle(i, e.target.value)}
              maxLength={200}
              className="w-full bg-transparent text-sm font-medium text-fg outline-none"
            />
            {s.detail && <p className="mt-0.5 text-xs text-fg-muted">{s.detail}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" hue="rose" onClick={() => remove(i)} aria-label="Remove">
            <Icon name="X" size={14} />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { setState("idle"); setSuggestions([]); }} faceClassName="px-3 py-2 text-xs font-medium">
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={apply}
          disabled={!suggestions.some((s) => s.title.trim())}
          className="flex-1"
          faceClassName="px-4 py-2 text-xs font-semibold"
        >
          <Icon name="Plus" size={14} />
          Add {suggestions.length} milestone{suggestions.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}

// ---- Phase H: Commit-composer AI matching -----------------------------------

export function CommitMilestoneMatcher({
  projectId,
  note,
  hasOpenMilestones,
  aiReady,
}: {
  projectId: string;
  note: string;
  hasOpenMilestones: boolean;
  aiReady: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "review">("idle");
  const [matches, setMatches] = useState<{ id: string; title: string; evidence: string; selected: boolean }[]>([]);
  const [, startTransition] = useTransition();

  if (!hasOpenMilestones) return null;

  const scan = () => {
    setState("loading");
    startTransition(async () => {
      const res: ScanResponse = await scanUpdateForMilestones(projectId, note);
      if (res.ok && res.matches.length) {
        setMatches(res.matches.map((m) => ({ ...m, selected: true })));
        setState("review");
      } else if (res.ok) {
        toast("No milestones matched this update.");
        setState("idle");
      } else {
        toast.error(res.error ?? "Couldn't scan the update.");
        setState("idle");
      }
    });
  };

  const toggle = (id: string) => {
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m)));
  };

  const confirm = () => {
    const ids = matches.filter((m) => m.selected).map((m) => m.id);
    if (!ids.length) return;
    setState("loading");
    startTransition(async () => {
      const res = await completeMilestones(projectId, ids);
      if (res.ok) {
        toast.success(`${ids.length} milestone${ids.length === 1 ? "" : "s"} completed`);
        setState("idle");
        setMatches([]);
      } else {
        toast.error(res.error ?? "Couldn't complete milestones.");
        setState("review");
      }
    });
  };

  if (state === "idle") {
    return (
      <div className="flex items-center gap-2">
        <GenerateButton
          label="Check off milestones"
          activeLabel="Scanning"
          size="sm"
          onClick={scan}
          disabled={!note.trim()}
          title="Check off milestones from this update"
        />
        {!aiReady && <span className="text-[10px] text-fg-muted">(demo)</span>}
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 text-xs text-fg-secondary">
        <Icon name="Loader" size={13} className="animate-spin" />
        Scanning…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-fg-secondary">Milestones that look done:</p>
      {matches.map((m) => (
        <label key={m.id} className="flex items-start gap-2.5 rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            checked={m.selected}
            onChange={() => toggle(m.id)}
            className="mt-0.5 accent-accent-mint"
          />
          <div className="min-w-0 flex-1">
            <span className={m.selected ? "font-medium text-fg" : "text-fg-muted"}>{m.title}</span>
            {m.evidence && <p className="mt-0.5 text-[10px] text-fg-muted">{m.evidence}</p>}
          </div>
        </label>
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { setState("idle"); setMatches([]); }} faceClassName="px-3 py-2 text-xs font-medium">
          Cancel
        </Button>
        <Button
          variant="primary"
          hue="mint"
          size="sm"
          onClick={confirm}
          disabled={!matches.some((m) => m.selected)}
          className="flex-1"
          faceClassName="px-3 py-2 text-xs font-semibold"
        >
          <Icon name="CheckCircle2" size={14} />
          Complete {matches.filter((m) => m.selected).length}
        </Button>
      </div>
    </div>
  );
}

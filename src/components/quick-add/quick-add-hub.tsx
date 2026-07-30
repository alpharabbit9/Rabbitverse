"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export type LogResult = { ok: boolean; error: string | null };
export type Action = (prev: LogResult, fd: FormData) => Promise<LogResult>;
type Cat = { id: string; name: string; color: string; icon: string };
type Proj = { id: string; name: string; unit: string };

const INITIAL: LogResult = { ok: false, error: null };
const demoAction: Action = async () => ({ ok: true, error: null });

export interface QuickAddActions {
  addExpense: Action;
  createProject: Action;
  logProgress: Action;
  setWorkout: Action;
  logWeight: Action;
  saveJournal: Action;
}

const TABS = [
  { key: "expense", label: "Expense", icon: "Wallet", accent: "var(--accent-mint)" },
  { key: "project", label: "Project", icon: "FolderKanban", accent: "var(--accent-blue)" },
  { key: "workout", label: "Workout", icon: "Dumbbell", accent: "var(--accent-purple)" },
  { key: "journal", label: "Journal", icon: "NotebookPen", accent: "var(--accent-orange)" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function QuickAddHub({
  mode,
  today,
  yesterday,
  categories,
  projects,
  actions,
}: {
  mode: "demo" | "live";
  today: string;
  yesterday: string;
  categories: Cat[];
  projects: Proj[];
  actions: QuickAddActions;
}) {
  const [tab, setTab] = useState<TabKey>("expense");
  const demo = mode === "demo";
  const pick = (a: Action) => (demo ? demoAction : a);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Log Activity</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {demo ? "Preview the logging flow — sign in to save it for real." : "A few taps and it folds into your Life Score instantly."}
        </p>
      </header>

      {/* Tab switcher */}
      <div className="glass flex gap-1 rounded-2xl p-1.5">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium transition-colors",
                active ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {active && (
                <motion.span
                  layoutId="qa-tab"
                  className="absolute inset-0 rounded-xl bg-card-hover"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon name={t.icon} size={16} className="relative" style={{ color: active ? t.accent : undefined }} />
              <span className="relative hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {tab === "expense" && (
          <ExpenseForm demo={demo} categories={categories} today={today} yesterday={yesterday} action={pick(actions.addExpense)} />
        )}
        {tab === "project" && (
          <ProjectForms demo={demo} projects={projects} createAction={pick(actions.createProject)} progressAction={pick(actions.logProgress)} />
        )}
        {tab === "workout" && (
          <WorkoutForm demo={demo} workoutAction={pick(actions.setWorkout)} weightAction={pick(actions.logWeight)} />
        )}
        {tab === "journal" && <JournalForm demo={demo} today={today} yesterday={yesterday} action={pick(actions.saveJournal)} />}
      </motion.div>
    </div>
  );
}

// ---- shared bits ----------------------------------------------------------

function useToastReset(state: LogResult, demo: boolean, formRef?: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (state.ok) {
      toast.success(demo ? "Looks good! Sign in to save it for real." : "Saved ✓");
      formRef?.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, demo, formRef]);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-fg-secondary">{children}</label>;
}

const inputCls =
  "w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-border-strong";

function DayToggle({ name, today, yesterday }: { name: string; today: string; yesterday: string }) {
  const [val, setVal] = useState(today);
  return (
    <div>
      <FieldLabel>When</FieldLabel>
      <input type="hidden" name={name} value={val} />
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: today, label: "Today" },
          { v: yesterday, label: "Yesterday" },
        ].map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setVal(o.v)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
              val === o.v ? "border-border-strong bg-card-hover text-fg" : "border-border text-fg-secondary hover:text-fg",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SubmitButton({ pending, children, from = "var(--accent-purple)", to = "var(--accent-blue)" }: { pending: boolean; children: React.ReactNode; from?: string; to?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      style={{ backgroundImage: `linear-gradient(90deg, ${from}, ${to})` }}
      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

// ---- Expense --------------------------------------------------------------

function ExpenseForm({ demo, categories, today, yesterday, action }: { demo: boolean; categories: Cat[]; today: string; yesterday: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const ref = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  useToastReset(state, demo, ref);

  const bump = (n: number) => {
    if (amountRef.current) amountRef.current.value = String((Number(amountRef.current.value) || 0) + n);
  };

  return (
    <form ref={ref} action={formAction} className="glass space-y-4 rounded-2xl p-5">
      <div>
        <FieldLabel>Amount (৳)</FieldLabel>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-fg-muted">৳</span>
          <input ref={amountRef} name="amount" type="number" inputMode="decimal" min="1" step="1" required placeholder="450" className={cn(inputCls, "py-3 pl-8 text-lg font-semibold")} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[50, 100, 500, 1000].map((q) => (
            <button key={q} type="button" onClick={() => bump(q)} className="rounded-lg border border-border px-2.5 py-1 text-xs text-fg-secondary transition-colors hover:border-border-strong hover:text-fg">
              +{q}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Category</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c, i) => (
            <label key={c.id} className="cursor-pointer">
              <input type="radio" name="category_id" value={c.id} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-2 py-2.5 text-xs transition-colors peer-checked:border-border-strong peer-checked:bg-card-hover">
                <Icon name={c.icon} size={15} style={{ color: c.color }} />
                {c.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <DayToggle name="spent_at" today={today} yesterday={yesterday} />

      <div>
        <FieldLabel>Note (optional)</FieldLabel>
        <input name="note" type="text" maxLength={200} placeholder="Lunch & coffee" className={inputCls} />
      </div>

      <SubmitButton pending={pending} from="var(--accent-mint)" to="var(--accent-blue)">
        <Icon name="Plus" size={16} /> Add expense
      </SubmitButton>
    </form>
  );
}

// ---- Project (new goal + log progress) ------------------------------------

const UNITS = ["%", "books", "sessions", "words", "৳", "days", "km"];

function ProjectForms({ demo, projects, createAction, progressAction }: { demo: boolean; projects: Proj[]; createAction: Action; progressAction: Action }) {
  const [sub, setSub] = useState<"new" | "progress">(projects.length ? "progress" : "new");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["progress", "new"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              sub === s ? "bg-card-hover text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {s === "progress" ? "Log progress" : "New goal"}
          </button>
        ))}
      </div>
      {sub === "new" ? <NewGoalForm demo={demo} action={createAction} /> : <ProgressForm demo={demo} projects={projects} action={progressAction} />}
    </div>
  );
}

function NewGoalForm({ demo, action }: { demo: boolean; action: Action }) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [unit, setUnit] = useState("%");
  const ref = useRef<HTMLFormElement>(null);
  useToastReset(state, demo, ref);

  return (
    <form ref={ref} action={formAction} className="glass space-y-4 rounded-2xl p-5">
      <div>
        <FieldLabel>Goal name</FieldLabel>
        <input name="name" required maxLength={120} placeholder="Read 20 books" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Target</FieldLabel>
          <input name="target_value" type="number" min="1" step="any" required placeholder="20" className={inputCls} />
        </div>
        <div>
          <FieldLabel>Unit</FieldLabel>
          <input name="target_unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%" className={inputCls} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {UNITS.map((u) => (
          <button key={u} type="button" onClick={() => setUnit(u)} className={cn("rounded-lg border px-2.5 py-1 text-xs transition-colors", unit === u ? "border-border-strong bg-card-hover text-fg" : "border-border text-fg-secondary hover:text-fg")}>
            {u}
          </button>
        ))}
      </div>
      <div>
        <FieldLabel>Description (optional)</FieldLabel>
        <input name="description" maxLength={300} placeholder="Why this matters to you" className={inputCls} />
      </div>
      <SubmitButton pending={pending} from="var(--accent-blue)" to="var(--accent-cyan)">
        <Icon name="Plus" size={16} /> Create goal
      </SubmitButton>
    </form>
  );
}

function ProgressForm({ demo, projects, action }: { demo: boolean; projects: Proj[]; action: Action }) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const ref = useRef<HTMLFormElement>(null);
  const amtRef = useRef<HTMLInputElement>(null);
  useToastReset(state, demo, ref);

  if (!projects.length) {
    return <p className="glass rounded-2xl p-5 text-sm text-fg-muted">No goals yet — switch to “New goal” to create your first one. 🐇</p>;
  }

  return (
    <form ref={ref} action={formAction} className="glass space-y-4 rounded-2xl p-5">
      <div>
        <FieldLabel>Goal</FieldLabel>
        <select name="project_id" className={inputCls} defaultValue={projects[0]?.id}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Progress to add</FieldLabel>
        <input ref={amtRef} name="amount" type="number" step="any" required placeholder="5" className={inputCls} />
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 5, 10, 25].map((q) => (
            <button key={q} type="button" onClick={() => { if (amtRef.current) amtRef.current.value = String(q); }} className="rounded-lg border border-border px-2.5 py-1 text-xs text-fg-secondary transition-colors hover:border-border-strong hover:text-fg">
              +{q}
            </button>
          ))}
        </div>
      </div>
      <SubmitButton pending={pending} from="var(--accent-blue)" to="var(--accent-cyan)">
        <Icon name="TrendingUp" size={16} /> Log progress
      </SubmitButton>
    </form>
  );
}

// ---- Workout --------------------------------------------------------------

const WORKOUT_TYPES = ["Push", "Pull", "Legs", "Cardio", "Full body", "Core"];

function WorkoutForm({ demo, workoutAction, weightAction }: { demo: boolean; workoutAction: Action; weightAction: Action }) {
  const [woState, woSubmit, woPending] = useActionState(workoutAction, INITIAL);
  const [wState, wSubmit, wPending] = useActionState(weightAction, INITIAL);
  const woRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState("Push");

  useEffect(() => {
    if (woState.ok) toast.success(demo ? "Nice! Sign in to save it." : "Workout logged ✓");
    else if (woState.error) toast.error(woState.error);
  }, [woState, demo]);
  useToastReset(wState, demo, weightRef);

  const submit = (done: boolean) => {
    if (doneRef.current) doneRef.current.value = String(done);
    woRef.current?.requestSubmit();
  };

  return (
    <div className="space-y-4">
      <form ref={woRef} action={woSubmit} className="glass space-y-4 rounded-2xl p-5">
        <input type="hidden" name="plan_label" value={type} />
        <input ref={doneRef} type="hidden" name="done" value="true" />
        <div>
          <FieldLabel>Type of session</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {WORKOUT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors",
                  type === t ? "border-border-strong bg-card-hover text-fg" : "border-border text-fg-secondary hover:text-fg",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => submit(true)} disabled={woPending} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60">
            <Icon name="Check" size={16} /> Mark {type} done
          </button>
          <button type="button" onClick={() => submit(false)} disabled={woPending} className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg disabled:opacity-60">
            Rest day
          </button>
        </div>
      </form>

      <form ref={weightRef} action={wSubmit} className="glass space-y-3 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="Activity" size={16} style={{ color: "var(--accent-purple)" }} />
          Body metrics (optional)
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Weight (kg)</FieldLabel>
            <input name="weight" type="number" step="0.1" min="1" placeholder="78.5" className={inputCls} />
          </div>
          <div>
            <FieldLabel>Body fat %</FieldLabel>
            <input name="body_fat" type="number" step="0.1" min="1" placeholder="18" className={inputCls} />
          </div>
        </div>
        <SubmitButton pending={wPending} from="var(--accent-purple)" to="var(--accent-blue)">
          <Icon name="Plus" size={16} /> Log body metrics
        </SubmitButton>
      </form>
    </div>
  );
}

// ---- Journal --------------------------------------------------------------

const MOODS = [
  { v: 1, emoji: "😔", label: "Rough" },
  { v: 2, emoji: "😕", label: "Low" },
  { v: 3, emoji: "🙂", label: "Okay" },
  { v: 4, emoji: "😊", label: "Good" },
  { v: 5, emoji: "🤩", label: "Great" },
];

function JournalForm({ demo, today, yesterday, action }: { demo: boolean; today: string; yesterday: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const ref = useRef<HTMLFormElement>(null);
  const [mood, setMood] = useState(4);
  useToastReset(state, demo, ref);

  return (
    <form ref={ref} action={formAction} className="glass space-y-4 rounded-2xl p-5">
      <input type="hidden" name="mood" value={mood} />
      <div>
        <FieldLabel>How did your day feel?</FieldLabel>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => setMood(m.v)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors",
                mood === m.v ? "border-border-strong bg-card-hover" : "border-border hover:bg-card-hover/50",
              )}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[10px] text-fg-muted">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
      <DayToggle name="entry_date" today={today} yesterday={yesterday} />
      <div>
        <FieldLabel>Reflection (optional)</FieldLabel>
        <textarea name="body" rows={4} maxLength={2000} placeholder="What happened today? What are you grateful for?" className={cn(inputCls, "resize-none")} />
      </div>
      <SubmitButton pending={pending} from="var(--accent-orange)" to="var(--accent-gold)">
        <Icon name="NotebookPen" size={16} /> Save journal
      </SubmitButton>
    </form>
  );
}

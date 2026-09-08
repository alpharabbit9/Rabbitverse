"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { AiLogBox } from "@/components/quick-add/ai-log-box";
import { Button } from "@/components/ui/button";
import { useCurrencySymbol } from "@/components/locale-provider";
import type { HueName } from "@/lib/hues";
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

/** `accent` tints the icon; `hue` tints the button's glow to match it. */
const TABS = [
  { key: "expense", label: "Expense", icon: "Wallet", accent: "var(--accent-mint)", hue: "mint" },
  { key: "project", label: "Project", icon: "FolderKanban", accent: "var(--accent-blue)", hue: "blue" },
  { key: "workout", label: "Workout", icon: "Dumbbell", accent: "var(--accent-purple)", hue: "purple" },
  { key: "journal", label: "Journal", icon: "NotebookPen", accent: "var(--accent-orange)", hue: "orange" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function QuickAddHub({
  mode,
  voiceReady,
  today,
  yesterday,
  categories,
  projects,
  actions,
}: {
  mode: "demo" | "live";
  /** Whether the Groq key is present, so the AI box can show the mic button. */
  voiceReady: boolean;
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

      <AiLogBox demo={demo} voiceReady={voiceReady} categories={categories} projects={projects} today={today} yesterday={yesterday} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">or log it by hand</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Tab switcher. The active tab used to be a sliding `layoutId` pill; the
          button's own glass now carries that job — a pill flying between two
          faces would be clipped by their overflow. */}
      <div className="glass flex gap-1 rounded-full p-1.5">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Button
              key={t.key}
              variant={active ? "primary" : "ghost"}
              hue={t.hue}
              selected={active}
              onClick={() => setTab(t.key)}
              className="flex-1 [--rv-pad:2px]"
              faceClassName="px-2 py-2.5 text-sm font-medium"
            >
              <Icon name={t.icon} size={16} style={{ color: active ? t.accent : undefined }} />
              <span className="hidden sm:inline">{t.label}</span>
            </Button>
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
          <Button
            key={o.v}
            block
            selected={val === o.v}
            onClick={() => setVal(o.v)}
            faceClassName="px-3 py-2.5 text-sm font-medium"
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Each hand-logging form ends in one of these; `hue` is the section's accent. */
function SubmitButton({ pending, children, hue = "purple" }: { pending: boolean; children: React.ReactNode; hue?: HueName }) {
  return (
    <Button type="submit" variant="primary" hue={hue} size="lg" block loading={pending} faceClassName="py-3">
      {pending ? "Saving…" : children}
    </Button>
  );
}

// ---- Expense --------------------------------------------------------------

function ExpenseForm({ demo, categories, today, yesterday, action }: { demo: boolean; categories: Cat[]; today: string; yesterday: string; action: Action }) {
  const symbol = useCurrencySymbol();
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
        <FieldLabel>Amount ({symbol})</FieldLabel>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-fg-muted">{symbol}</span>
          <input ref={amountRef} name="amount" type="number" inputMode="decimal" min="1" step="1" required placeholder="450" className={cn(inputCls, "py-3 pl-8 text-lg font-semibold")} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[50, 100, 500, 1000].map((q) => (
            <Button key={q} size="sm" hue="mint" onClick={() => bump(q)} faceClassName="px-2.5 py-1 text-xs font-normal">
              +{q}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Category</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c, i) => (
            // A radio, not a button — but it wears the same glass so the grid
            // reads as one control strip. `peer-checked` stands in for the
            // `selected` prop <Button/> would use.
            <label key={c.id} className="rv-btn cursor-pointer [--rv-pad:3px]">
              <input type="radio" name="category_id" value={c.id} defaultChecked={i === 0} className="peer sr-only" />
              <span className="rv-btn-face gap-1.5 px-2 py-2.5 text-xs peer-checked:border-border-strong peer-checked:bg-card-hover peer-checked:text-fg">
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

      <SubmitButton pending={pending} hue="mint">
        <Icon name="Plus" size={16} /> Add expense
      </SubmitButton>
    </form>
  );
}

// ---- Project (new goal + log progress) ------------------------------------

/** Goal units. The currency one is filled in from the user's profile at render. */
const UNITS = ["%", "books", "sessions", "words", "days", "km"];

function ProjectForms({ demo, projects, createAction, progressAction }: { demo: boolean; projects: Proj[]; createAction: Action; progressAction: Action }) {
  const [sub, setSub] = useState<"new" | "progress">(projects.length ? "progress" : "new");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["progress", "new"] as const).map((s) => (
          <Button
            key={s}
            variant={sub === s ? "primary" : "ghost"}
            hue="blue"
            size="sm"
            selected={sub === s}
            onClick={() => setSub(s)}
            faceClassName="px-3.5 py-1.5 text-sm font-medium"
          >
            {s === "progress" ? "Log progress" : "New goal"}
          </Button>
        ))}
      </div>
      {sub === "new" ? <NewGoalForm demo={demo} action={createAction} /> : <ProgressForm demo={demo} projects={projects} action={progressAction} />}
    </div>
  );
}

function NewGoalForm({ demo, action }: { demo: boolean; action: Action }) {
  const symbol = useCurrencySymbol();
  // A money goal ("Save ৳50k") is a unit like any other — it just has to be the
  // user's own currency rather than a baked-in ৳.
  const units = [...UNITS, symbol];
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
        {units.map((u) => (
          <Button key={u} size="sm" hue="blue" selected={unit === u} onClick={() => setUnit(u)} faceClassName="px-2.5 py-1 text-xs font-normal">
            {u}
          </Button>
        ))}
      </div>
      <div>
        <FieldLabel>Description (optional)</FieldLabel>
        <input name="description" maxLength={300} placeholder="Why this matters to you" className={inputCls} />
      </div>
      <SubmitButton pending={pending} hue="blue">
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
            <Button key={q} size="sm" hue="blue" onClick={() => { if (amtRef.current) amtRef.current.value = String(q); }} faceClassName="px-2.5 py-1 text-xs font-normal">
              +{q}
            </Button>
          ))}
        </div>
      </div>
      <SubmitButton pending={pending} hue="blue">
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
              <Button
                key={t}
                block
                selected={type === t}
                onClick={() => setType(t)}
                faceClassName="px-2 py-2.5 text-xs font-medium"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="lg" onClick={() => submit(true)} loading={woPending} className="flex-1" faceClassName="py-3">
            <Icon name="Check" size={16} /> Mark {type} done
          </Button>
          <Button size="lg" onClick={() => submit(false)} disabled={woPending} faceClassName="py-3">
            Rest day
          </Button>
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
        <SubmitButton pending={wPending} hue="purple">
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
            <Button
              key={m.v}
              block
              hue="orange"
              selected={mood === m.v}
              onClick={() => setMood(m.v)}
              faceClassName="flex-col gap-1 px-0 py-2.5"
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[10px] text-fg-muted">{m.label}</span>
            </Button>
          ))}
        </div>
      </div>
      <DayToggle name="entry_date" today={today} yesterday={yesterday} />
      <div>
        <FieldLabel>Reflection (optional)</FieldLabel>
        <textarea name="body" rows={4} maxLength={2000} placeholder="What happened today? What are you grateful for?" className={cn(inputCls, "resize-none")} />
      </div>
      <SubmitButton pending={pending} hue="orange">
        <Icon name="NotebookPen" size={16} /> Save journal
      </SubmitButton>
    </form>
  );
}

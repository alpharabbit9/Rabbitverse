"use client";

/*
  The flagship V2 input: type one sentence about your day, Rabbit parses it into
  a set of chips, you fix anything it misread, then one Save writes all of them.

  Flow: idle → parsing → review (editable chips) → saving → idle + toast.
  The parse and the save are both single Server Actions (`parseLog`/`saveIntents`)
  — the client never talks to Groq or Supabase directly, and every chip is
  re-validated server-side before it reaches a write path.
*/

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { parseLog, saveIntents } from "@/app/(app)/quick-add/ai-actions";
import { type Dispatch, dispatchUnresolved } from "@/lib/ai/parse-log";
import { cn } from "@/lib/utils";
import { useCurrencySymbol } from "@/components/locale-provider";

type Cat = { id: string; name: string; color: string; icon: string };
type Proj = { id: string; name: string; unit: string };

/** Example prompts. `sym` is the user's currency symbol, not a baked-in ৳. */
const examplesFor = (sym: string) => [
  `spent ${sym}450 on lunch, hit legs day, feeling good 4/5`,
  `yesterday: ${sym}1200 groceries and a rest day`,
  "ran 5k, read 2 chapters, 78.5kg this morning",
];

/** Per-kind chip chrome — icon + accent, matching the tabs below it. */
const CHIP_STYLE: Record<Dispatch["kind"], { icon: string; accent: string; label: string }> = {
  expense: { icon: "Wallet", accent: "var(--accent-mint)", label: "Expense" },
  workout: { icon: "Dumbbell", accent: "var(--accent-purple)", label: "Workout" },
  weight: { icon: "Activity", accent: "var(--accent-purple)", label: "Body" },
  journal: { icon: "NotebookPen", accent: "var(--accent-orange)", label: "Journal" },
  project: { icon: "FolderKanban", accent: "var(--accent-blue)", label: "Progress" },
};

const inputCls =
  "w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-sm outline-none transition-colors focus:border-border-strong";

/**
 * The chip's headline, derived from the *current* field values. The server's
 * summary describes what the model first said, so it goes stale the moment the
 * user fixes a category or an amount — and it's the text a failure toast quotes.
 */
function summarize(d: Dispatch, categories: Cat[], projects: Proj[], sym: string): string {
  const f = d.fields;
  switch (d.kind) {
    case "expense": {
      const cat = categories.find((c) => c.id === f.category_id)?.name;
      return `${sym}${f.amount || "—"} · ${cat ?? "Pick a category"}`;
    }
    case "workout":
      return f.done === "false" ? "Rest day" : `Workout: ${f.plan_label || "session"} done`;
    case "weight": {
      const parts = [f.weight ? `${f.weight} kg` : null, f.body_fat ? `${f.body_fat}% fat` : null].filter(Boolean);
      return `Body: ${parts.join(" · ") || "—"}`;
    }
    case "journal":
      return f.mood ? `Mood ${f.mood}/5` : "Pick how the day felt";
    case "project": {
      const proj = projects.find((p) => p.id === f.project_id)?.name;
      return `${proj ?? "Pick a goal"} +${f.amount || "—"}`;
    }
  }
}

export function AiLogBox({
  demo,
  categories,
  projects,
  today,
  yesterday,
}: {
  demo: boolean;
  categories: Cat[];
  projects: Proj[];
  today: string;
  yesterday: string;
}) {
  const symbol = useCurrencySymbol();
  const examples = examplesFor(symbol);
  const [sentence, setSentence] = useState("");
  const [items, setItems] = useState<Dispatch[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [parsing, startParse] = useTransition();
  const [saving, startSave] = useTransition();

  const blocked = items?.some((d) => dispatchUnresolved(d).length > 0) ?? false;

  const reset = () => {
    setItems(null);
    setSentence("");
    setOffline(false);
  };

  const parse = () => {
    if (!sentence.trim() || parsing) return;
    startParse(async () => {
      const res = await parseLog(sentence);
      if (!res.ok) {
        toast.error(res.error ?? "Rabbit couldn't read that.");
        return;
      }
      if (!res.dispatches.length) {
        toast("Nothing to log there — try mentioning a spend, a workout, or how you felt.");
        return;
      }
      setOffline(res.demo);
      setItems(res.dispatches);
    });
  };

  const save = () => {
    if (!items?.length || saving || blocked) return;
    const current = items;
    startSave(async () => {
      const res = await saveIntents(current);
      if (res.demo) {
        toast.success("Looks good! Sign in to save it for real.");
        reset();
        return;
      }
      if (res.saved) toast.success(`Saved ${res.saved} ${res.saved === 1 ? "entry" : "entries"} ✓`);
      if (res.failures.length) {
        toast.error(`${res.failures[0].summary}: ${res.failures[0].error}`);
        // Keep only what failed, by index, so a retry can't double-write what
        // already landed (two identical chips can share a summary).
        const failed = new Set(res.failures.map((f) => f.index));
        setItems(current.filter((_, i) => failed.has(i)));
        return;
      }
      if (!res.saved) toast.error(res.error ?? "Nothing was saved.");
      else reset();
    });
  };

  const update = (i: number, fields: Record<string, string>) =>
    setItems(
      (prev) =>
        prev?.map((d, n) => {
          if (n !== i) return d;
          const next = { ...d, fields: { ...d.fields, ...fields } };
          return { ...next, summary: summarize(next, categories, projects, symbol) };
        }) ?? prev,
    );

  const remove = (i: number) =>
    setItems((prev) => {
      const next = prev?.filter((_, n) => n !== i) ?? [];
      return next.length ? next : null;
    });

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5">
      {/* soft wash so the hero input reads as the primary path */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl"
        style={{ background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))" }}
      />

      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-purple/15">
            <Icon name="Sparkles" size={16} style={{ color: "var(--accent-purple)" }} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Tell Rabbit what you did</h2>
            <p className="text-xs text-fg-secondary">One sentence — it sorts itself into the right sections.</p>
          </div>
        </div>

        <textarea
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) parse();
          }}
          rows={3}
          maxLength={500}
          disabled={parsing || saving}
          placeholder={`ran 5k this morning, spent ${symbol}400 on lunch, feeling good 4/5`}
          className={cn(inputCls, "resize-none py-3 leading-relaxed")}
        />

        {!items && (
          <div className="flex flex-wrap gap-1.5">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setSentence(ex)}
                className="rounded-lg border border-border px-2.5 py-1 text-left text-[11px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={parse}
          disabled={!sentence.trim() || parsing || saving}
          style={{ backgroundImage: "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))" }}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {parsing ? (
            "Reading…"
          ) : (
            <>
              <Icon name="Sparkles" size={16} /> Log it
            </>
          )}
        </button>

        {/* ---- Review ---- */}
        <AnimatePresence initial={false}>
          {items && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 pt-2">
                <p className="text-xs font-medium text-fg-secondary">
                  Here&apos;s what Rabbit understood — fix anything, then save.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                >
                  Start over
                </button>
              </div>

              {offline && (
                <p className="rounded-xl border border-border px-3 py-2 text-[11px] text-fg-muted">
                  Preview parse (not signed in, or no AI key) — the real parser reads far messier sentences.
                </p>
              )}

              {items.map((d, i) => (
                <Chip
                  key={`${d.action}-${i}`}
                  dispatch={d}
                  categories={categories}
                  projects={projects}
                  today={today}
                  yesterday={yesterday}
                  onChange={(f) => update(i, f)}
                  onRemove={() => remove(i)}
                />
              ))}

              <button
                type="button"
                onClick={save}
                disabled={saving || blocked}
                style={{ backgroundImage: "linear-gradient(90deg, var(--accent-mint), var(--accent-blue))" }}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              >
                {saving ? (
                  "Saving…"
                ) : (
                  <>
                    <Icon name="Check" size={16} /> Save all ({items.length})
                  </>
                )}
              </button>

              {blocked && <p className="text-center text-[11px] text-fg-muted">Fill the highlighted fields to save.</p>}
              {demo && !offline && <p className="text-center text-[11px] text-fg-muted">Demo mode — nothing is written.</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---- One reviewable chip ---------------------------------------------------

function Chip({
  dispatch: d,
  categories,
  projects,
  today,
  yesterday,
  onChange,
  onRemove,
}: {
  dispatch: Dispatch;
  categories: Cat[];
  projects: Proj[];
  today: string;
  yesterday: string;
  onChange: (fields: Record<string, string>) => void;
  onRemove: () => void;
}) {
  const symbol = useCurrencySymbol();
  const style = CHIP_STYLE[d.kind];
  const missing = dispatchUnresolved(d);
  const needs = (key: string) => missing.includes(key);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border bg-card-hover/40 p-3", missing.length ? "border-accent-orange/50" : "border-border")}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <Icon name={style.icon} size={15} style={{ color: style.accent }} />
        <span className="shrink-0 text-xs font-semibold" style={{ color: style.accent }}>
          {style.label}
        </span>
        <span className="truncate text-xs text-fg-secondary">{d.summary}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${style.label}`}
          className="ml-auto grid size-6 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-card-hover hover:text-fg"
        >
          <Icon name="X" size={14} />
        </button>
      </div>

      {d.kind === "expense" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Amount (${symbol})`}>
              <input
                type="number"
                min="1"
                step="1"
                value={d.fields.amount ?? ""}
                onChange={(e) => onChange({ amount: e.target.value })}
                className={cn(inputCls, needs("amount") && "border-accent-orange/60")}
              />
            </Field>
            <Field label="Category">
              <select
                value={d.fields.category_id ?? ""}
                onChange={(e) => onChange({ category_id: e.target.value })}
                className={cn(inputCls, needs("category_id") && "border-accent-orange/60")}
              >
                <option value="">Pick one…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <DayPick
            value={d.fields.spent_at ?? today}
            today={today}
            yesterday={yesterday}
            onPick={(v) => onChange({ spent_at: v })}
          />
          <input
            type="text"
            maxLength={200}
            placeholder="Note (optional)"
            value={d.fields.note ?? ""}
            onChange={(e) => onChange({ note: e.target.value })}
            className={inputCls}
          />
        </div>
      )}

      {d.kind === "workout" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "true", label: "Did it" },
              { v: "false", label: "Rest day" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => onChange({ done: o.v })}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  (d.fields.done ?? "true") === o.v
                    ? "border-border-strong bg-card-hover text-fg"
                    : "border-border text-fg-secondary hover:text-fg",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            maxLength={40}
            placeholder="Type of session"
            value={d.fields.plan_label ?? ""}
            onChange={(e) => onChange({ plan_label: e.target.value })}
            className={inputCls}
          />
          <DayPick
            value={d.fields.log_date ?? today}
            today={today}
            yesterday={yesterday}
            onPick={(v) => onChange({ log_date: v })}
          />
        </div>
      )}

      {d.kind === "weight" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Weight (kg)">
              <input
                type="number"
                step="0.1"
                min="1"
                value={d.fields.weight ?? ""}
                onChange={(e) => onChange({ weight: e.target.value })}
                className={cn(inputCls, needs("weight") && "border-accent-orange/60")}
              />
            </Field>
            <Field label="Body fat %">
              <input
                type="number"
                step="0.1"
                min="1"
                value={d.fields.body_fat ?? ""}
                onChange={(e) => onChange({ body_fat: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <DayPick
            value={d.fields.log_date ?? today}
            today={today}
            yesterday={yesterday}
            onPick={(v) => onChange({ log_date: v })}
          />
        </div>
      )}

      {d.kind === "journal" && (
        <div className="space-y-2">
          <div className={cn("grid grid-cols-5 gap-1.5 rounded-xl", needs("mood") && "ring-1 ring-accent-orange/50")}>
            {[
              { v: "1", e: "😔" },
              { v: "2", e: "😕" },
              { v: "3", e: "🙂" },
              { v: "4", e: "😊" },
              { v: "5", e: "🤩" },
            ].map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => onChange({ mood: m.v })}
                aria-label={`Mood ${m.v} of 5`}
                className={cn(
                  "rounded-xl border py-1.5 text-lg transition-colors",
                  d.fields.mood === m.v ? "border-border-strong bg-card-hover" : "border-border hover:bg-card-hover/50",
                )}
              >
                {m.e}
              </button>
            ))}
          </div>
          <DayPick
            value={d.fields.entry_date ?? today}
            today={today}
            yesterday={yesterday}
            onPick={(v) => onChange({ entry_date: v })}
          />
          <textarea
            rows={2}
            maxLength={2000}
            placeholder="Reflection (optional)"
            value={d.fields.body ?? ""}
            onChange={(e) => onChange({ body: e.target.value })}
            className={cn(inputCls, "resize-none")}
          />
        </div>
      )}

      {d.kind === "project" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Goal">
              <select
                value={d.fields.project_id ?? ""}
                onChange={(e) => onChange({ project_id: e.target.value })}
                className={cn(inputCls, needs("project_id") && "border-accent-orange/60")}
              >
                <option value="">Pick one…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Progress to add">
              <input
                type="number"
                step="any"
                value={d.fields.amount ?? ""}
                onChange={(e) => onChange({ amount: e.target.value })}
                className={cn(inputCls, needs("amount") && "border-accent-orange/60")}
              />
            </Field>
          </div>
          <DayPick
            value={d.fields.log_date ?? today}
            today={today}
            yesterday={yesterday}
            onPick={(v) => onChange({ log_date: v })}
          />
        </div>
      )}
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-medium text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

function DayPick({
  value,
  today,
  yesterday,
  onPick,
}: {
  value: string;
  today: string;
  yesterday: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { v: today, label: "Today" },
        { v: yesterday, label: "Yesterday" },
      ].map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onPick(o.v)}
          className={cn(
            "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
            value === o.v ? "border-border-strong bg-card-hover text-fg" : "border-border text-fg-secondary hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

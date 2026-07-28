"use client";

import { addDays, shortDate } from "@/lib/dates";
import type { DayActivity, JournalEntry } from "@/lib/types";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { TrendChart } from "@/components/charts/trend-chart";
import { JournalForm } from "./journal-form";

const MOOD_FACE = ["", "😔", "😕", "😐", "🙂", "😄"];

export function MentalView({
  journal,
  activity,
  today,
  canLog = false,
}: {
  journal: JournalEntry[];
  activity: DayActivity[];
  today: string;
  canLog?: boolean;
}) {
  const sorted = [...journal].sort((a, b) => (a.date < b.date ? -1 : 1));
  const moodTrend = sorted.map((j) => ({ label: shortDate(j.date), value: j.mood }));
  const avgMood = journal.length ? +(journal.reduce((a, j) => a + j.mood, 0) / journal.length).toFixed(1) : 0;
  const recent = [...sorted].reverse().slice(0, 6);

  return (
    <div className="space-y-6 sm:space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Mental Health</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {avgMood ? `Average mood ${avgMood}/5 · ` : ""}
          {journal.length} reflection{journal.length === 1 ? "" : "s"}
        </p>
      </header>

      <Panel title="How was your day?" subtitle="Describe your day — a calm, private journal">
        {canLog ? (
          <JournalForm today={today} yesterday={addDays(today, -1)} />
        ) : (
          <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-card-hover/60 px-4 py-3 text-left text-sm text-fg-muted transition-colors hover:border-border-strong">
            <span className="text-lg">✍️</span>
            Write today&apos;s reflection…
          </button>
        )}
      </Panel>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Panel title="Mood Trend" className="lg:col-span-2" subtitle="Your mood over time">
          {moodTrend.length ? (
            <TrendChart data={moodTrend} color="var(--accent-orange)" height={220} domain={[1, 5]} />
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-fg-muted">
              <span className="max-w-[200px]">Save a reflection to start your mood trend.</span>
            </div>
          )}
        </Panel>
        <Panel title="Recent Journal">
          {recent.length ? (
            <ul className="space-y-3">
              {recent.map((j) => (
                <li key={j.id} className="rounded-xl border border-border p-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
                    <span>{shortDate(j.date)}</span>
                    <span className="text-base">{MOOD_FACE[j.mood]}</span>
                  </div>
                  {j.body ? <p className="line-clamp-2 text-sm text-fg-secondary">{j.body}</p> : <p className="text-sm text-fg-muted">Mood {j.mood}/5</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-fg-muted">No entries yet.</p>
          )}
        </Panel>
      </div>

      <Panel title="Journaling Activity" subtitle="Days you checked in with yourself">
        <ActivityHeatmap activity={activity} section="mental" today={today} />
      </Panel>
    </div>
  );
}

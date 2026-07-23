"use client";

import { shortDate } from "@/lib/dates";
import { activity, journal, TODAY_ISO } from "@/lib/sample-data";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { TrendChart } from "@/components/charts/trend-chart";

const MOOD_FACE = ["", "😔", "😕", "😐", "🙂", "😄"];

export default function MentalHealthPage() {
  const moodTrend = journal.map((j) => ({ label: shortDate(j.date), value: j.mood }));
  const avgMood = journal.length ? +(journal.reduce((a, j) => a + j.mood, 0) / journal.length).toFixed(1) : 0;
  const recent = [...journal].reverse().slice(0, 6);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Mental Health</h1>
        <p className="mt-1 text-sm text-fg-secondary">Average mood {avgMood}/5 · {journal.length} reflections</p>
      </header>

      <Panel title="How was your day?" subtitle="Describe your day — a calm, private journal">
        <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-card-hover/60 px-4 py-3 text-left text-sm text-fg-muted transition-colors hover:border-border-strong">
          <span className="text-lg">✍️</span>
          Write today&apos;s reflection…
        </button>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Mood Trend" className="lg:col-span-2" subtitle="Your mood over time">
          <TrendChart data={moodTrend} color="var(--accent-orange)" height={220} domain={[1, 5]} />
        </Panel>
        <Panel title="Recent Journal">
          <ul className="space-y-3">
            {recent.map((j) => (
              <li key={j.id} className="rounded-xl border border-border p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
                  <span>{shortDate(j.date)}</span>
                  <span className="text-base">{MOOD_FACE[j.mood]}</span>
                </div>
                <p className="line-clamp-2 text-sm text-fg-secondary">{j.body}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Journaling Activity" subtitle="Days you checked in with yourself">
        <ActivityHeatmap activity={activity} section="mental" today={TODAY_ISO} />
      </Panel>
    </div>
  );
}

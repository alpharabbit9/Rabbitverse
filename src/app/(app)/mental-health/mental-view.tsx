"use client";

import { addDays, shortDate } from "@/lib/dates";
import type { DayActivity, JournalEntry } from "@/lib/types";
import type { TargetStatus } from "@/lib/targets";
import { TargetWarnings } from "@/components/dashboard/target-warning";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { TrendChart } from "@/components/charts/trend-chart";
import { JournalForm } from "./journal-form";
import { RecentJournal } from "./recent-journal";
import { Button } from "@/components/ui/button";
import { RangeToggle, useRange } from "@/components/ui/range-toggle";
import { sliceRange } from "@/lib/range";

export function MentalView({
  journal,
  activity,
  today,
  statuses = [],
  canLog = false,
}: {
  journal: JournalEntry[];
  activity: DayActivity[];
  today: string;
  statuses?: TargetStatus[];
  canLog?: boolean;
}) {
  const [range, setRange] = useRange();
  const sorted = [...journal].sort((a, b) => (a.date < b.date ? -1 : 1));
  const moodTrend = sliceRange(sorted, today, range).map((j) => ({ label: shortDate(j.date), value: j.mood }));
  const recent = [...sorted].reverse().slice(0, 6);

  // Averaged over the last 30 days, not all time. The fetch reaches back a full
  // year, so an all-time mean is anchored by months you can no longer affect —
  // a genuinely rough fortnight couldn't move the number in the header.
  const since = addDays(today, -29);
  const window = journal.filter((j) => j.date >= since && j.date <= today);
  const avgMood = window.length ? +(window.reduce((a, j) => a + j.mood, 0) / window.length).toFixed(1) : 0;

  return (
    <div className="space-y-6 sm:space-y-7">
      <header>
        <h1 className="heading-display text-2xl font-bold">Mental Health</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {avgMood ? `Average mood ${avgMood}/5 (30d) · ` : ""}
          {journal.length} reflection{journal.length === 1 ? "" : "s"}
        </p>
      </header>

      <TargetWarnings statuses={statuses} />

      <Panel title="How was your day?" subtitle="Describe your day — a calm, private journal">
        {canLog ? (
          <JournalForm today={today} yesterday={addDays(today, -1)} />
        ) : (
          <Button block hue="orange" size="lg" faceClassName="justify-start gap-3 py-3 text-sm font-normal">
            <span className="text-lg">✍️</span>
            Write today&apos;s reflection…
          </Button>
        )}
      </Panel>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Panel title="Mood Trend" className="lg:col-span-2" subtitle="Your mood over time" action={<RangeToggle value={range} onChange={setRange} />}>
          {moodTrend.length ? (
            <TrendChart data={moodTrend} color="var(--accent-orange)" height={220} domain={[1, 5]} />
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-fg-muted">
              <span className="max-w-[200px]">Save a reflection to start your mood trend.</span>
            </div>
          )}
        </Panel>
        <Panel title="Recent Journal" subtitle={canLog ? "Edit or delete any entry" : undefined}>
          <RecentJournal entries={recent} today={today} yesterday={addDays(today, -1)} canLog={canLog} />
        </Panel>
      </div>

      <Panel title="Journaling Activity" subtitle="Days you checked in with yourself">
        <ActivityHeatmap activity={activity} section="mental" today={today} />
      </Panel>
    </div>
  );
}

"use client";

import type { DayActivity, Project } from "@/lib/types";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { Ring } from "@/components/ui/ring";
import { Icon } from "@/components/icon";
import { NewProjectForm, ProgressLogger } from "./project-forms";

export function ProjectsView({
  projects,
  activity,
  today,
  canLog = false,
}: {
  projects: Project[];
  activity: DayActivity[];
  today: string;
  canLog?: boolean;
}) {
  const ongoing = projects.filter((p) => p.status === "ongoing");
  const completed = projects.filter((p) => p.status === "completed");

  return (
    <div className="space-y-6 sm:space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {ongoing.length} in progress · {completed.length} completed · {projects.length} total
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {ongoing.map((p) => {
          const pct = Math.min(100, Math.round((p.current / Math.max(1, p.targetValue)) * 100));
          return (
            <div key={p.id} className="glass flex flex-col gap-3 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <Ring value={pct} size={84} stroke={8} from="var(--accent-blue)" to="var(--accent-cyan)" id={p.id}>
                  <span className="text-sm font-bold">{pct}%</span>
                </Ring>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-xs text-fg-muted">
                    {p.current.toLocaleString()} / {p.targetValue.toLocaleString()} {p.targetUnit}
                  </div>
                </div>
              </div>
              {canLog && <ProgressLogger projectId={p.id} unit={p.targetUnit} />}
            </div>
          );
        })}

        {canLog && <NewProjectForm />}
      </div>

      {canLog && ongoing.length === 0 && (
        <p className="text-center text-sm text-fg-muted">No active projects yet — create one above to start tracking. 🐇</p>
      )}

      {completed.length > 0 && (
        <Panel title="Completed" subtitle={`${completed.length} shipped`}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {completed.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm">
                <Icon name="CheckCircle2" size={16} style={{ color: "var(--accent-mint)" }} />
                <span className="font-medium">{p.name}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Project Activity" subtitle="Days you moved a project forward">
        <ActivityHeatmap activity={activity} section="projects" today={today} />
      </Panel>
    </div>
  );
}

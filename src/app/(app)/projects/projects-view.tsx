"use client";

import Link from "next/link";
import type { DayActivity, Project } from "@/lib/types";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { Ring } from "@/components/ui/ring";
import { Icon } from "@/components/icon";
import { NewProjectForm } from "./project-forms";

/** Percent complete: checklist-driven when the project has tasks, else numeric. */
function progressPct(p: Project): number {
  if (p.tasks && p.tasks.length) {
    return Math.round((p.tasks.filter((t) => t.done).length / p.tasks.length) * 100);
  }
  return Math.min(100, Math.round((p.current / Math.max(1, p.targetValue)) * 100));
}

function progressMeta(p: Project): string {
  if (p.tasks && p.tasks.length) {
    return `${p.tasks.filter((t) => t.done).length}/${p.tasks.length} tasks`;
  }
  return `${Math.round(p.current).toLocaleString()} / ${p.targetValue.toLocaleString()} ${p.targetUnit}`;
}

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
          const pct = progressPct(p);
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="glass group flex flex-col gap-3 rounded-2xl p-5 transition-colors hover:border-border-strong"
            >
              <div className="flex items-center gap-4">
                <Ring value={pct} size={84} stroke={8} from="var(--accent-blue)" to="var(--accent-cyan)" id={p.id}>
                  <span className="text-sm font-bold">{pct}%</span>
                </Ring>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-xs text-fg-muted">{progressMeta(p)}</div>
                  {p.daysWorked != null && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-fg-secondary">
                      <Icon name="Flame" size={12} style={{ color: "var(--accent-orange)" }} />
                      {p.daysWorked} day{p.daysWorked === 1 ? "" : "s"} logged
                    </div>
                  )}
                </div>
                <Icon name="ChevronRight" size={16} className="shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5" />
              </div>
              {p.description && <p className="truncate text-xs text-fg-muted">{p.description}</p>}
            </Link>
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
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm transition-colors hover:border-border-strong"
                >
                  <Icon name="CheckCircle2" size={16} style={{ color: "var(--accent-mint)" }} />
                  <span className="font-medium">{p.name}</span>
                </Link>
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

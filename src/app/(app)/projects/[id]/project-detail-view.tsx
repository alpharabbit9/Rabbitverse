"use client";

import Link from "next/link";
import type { DayActivity, Project } from "@/lib/types";
import { parseDay, shortDate } from "@/lib/dates";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { Ring } from "@/components/ui/ring";
import { Icon } from "@/components/icon";
import { CommitComposer, TaskAdder, TaskRow } from "../project-forms";

const DAY_MS = 86_400_000;

function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / DAY_MS);
}

function progressPct(p: Project): number {
  if (p.tasks && p.tasks.length) {
    return Math.round((p.tasks.filter((t) => t.done).length / p.tasks.length) * 100);
  }
  return Math.min(100, Math.round((p.current / Math.max(1, p.targetValue)) * 100));
}

export function ProjectDetailView({
  project,
  activity,
  today,
  canLog = false,
}: {
  project: Project;
  activity: DayActivity[];
  today: string;
  canLog?: boolean;
}) {
  const pct = progressPct(project);
  const tasks = project.tasks ?? [];
  const commits = project.commits ?? [];
  const daysWorked = project.daysWorked ?? 0;
  const doneCount = tasks.filter((t) => t.done).length;

  const daysElapsed = daysBetween(project.startDate, today) + 1;
  const daysLeft = project.targetDate ? daysBetween(today, project.targetDate) : null;

  const stats = [
    { label: "Days worked", value: daysWorked, icon: "Flame", accent: "var(--accent-orange)" },
    { label: "Updates", value: commits.length, icon: "PenLine", accent: "var(--accent-blue)" },
    {
      label: tasks.length ? "Tasks done" : "Progress",
      value: tasks.length ? `${doneCount}/${tasks.length}` : `${pct}%`,
      icon: "CheckCircle2",
      accent: "var(--accent-mint)",
    },
  ];

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-fg-secondary transition-colors hover:text-fg">
        <Icon name="ChevronLeft" size={16} />
        All projects
      </Link>

      {/* Header */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-5">
          <Ring value={pct} size={100} stroke={9} from="var(--accent-blue)" to="var(--accent-cyan)" id={project.id}>
            <span className="text-lg font-bold">{pct}%</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{project.name}</h1>
            {project.status === "completed" && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-card-hover px-2 py-0.5 text-xs font-medium" style={{ color: "var(--accent-mint)" }}>
                <Icon name="CheckCircle2" size={13} /> Completed
              </span>
            )}
            {project.goals ? (
              <p className="mt-2 whitespace-pre-line text-sm text-fg-secondary">{project.goals}</p>
            ) : (
              project.description && <p className="mt-2 text-sm text-fg-secondary">{project.description}</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-xs">
          <span className="flex items-center gap-1.5 text-fg-secondary">
            <Icon name="Calendar" size={14} className="text-fg-muted" />
            Started {shortDate(project.startDate)} · day {daysElapsed}
          </span>
          {project.targetDate && (
            <span className="flex items-center gap-1.5 text-fg-secondary">
              <Icon name="Target" size={14} className="text-fg-muted" />
              Aiming for {shortDate(project.targetDate)}
              {daysLeft != null && (
                <span className={daysLeft < 0 ? "text-accent-orange" : "text-fg-muted"}>
                  ({daysLeft < 0 ? `${-daysLeft}d overdue` : `${daysLeft}d left`})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass flex items-center gap-3 rounded-2xl p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card-hover">
              <Icon name={s.icon} size={18} style={{ color: s.accent }} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-lg font-bold tabular-nums">{s.value}</div>
              <div className="text-xs text-fg-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tasks checklist */}
      <Panel title="Tasks & milestones" subtitle={tasks.length ? `${doneCount} of ${tasks.length} done` : "What you're aiming to achieve"}>
        {tasks.length > 0 ? (
          <ul className="space-y-2.5">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} canLog={canLog} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">{canLog ? "No tasks yet — add the first one below." : "No tasks yet."}</p>
        )}
        {canLog && <TaskAdder projectId={project.id} />}
      </Panel>

      {/* Progress updates / commits */}
      <Panel title="Progress updates" subtitle={`${commits.length} update${commits.length === 1 ? "" : "s"} · ${daysWorked} day${daysWorked === 1 ? "" : "s"} worked`}>
        {canLog && (
          <div className="mb-4">
            <CommitComposer projectId={project.id} />
          </div>
        )}
        {commits.length > 0 ? (
          <ol className="space-y-3">
            {commits.map((c) => (
              <li key={c.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-card-hover">
                    <Icon name="PenLine" size={12} style={{ color: "var(--accent-blue)" }} />
                  </span>
                  <span className="mt-1 w-px flex-1 bg-border" />
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="text-xs font-medium text-fg-muted">{shortDate(c.date)}</div>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-fg">{c.note}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-fg-muted">
            {canLog ? "No updates yet — log your first one above. Each update counts as a day worked." : "No updates logged yet."}
          </p>
        )}
      </Panel>

      <Panel title="Project Activity" subtitle="Days you moved this project forward">
        <ActivityHeatmap activity={activity} section="projects" today={today} />
      </Panel>
    </div>
  );
}

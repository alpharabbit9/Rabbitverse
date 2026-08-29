"use client";

import { useState } from "react";
import Link from "next/link";
import type { DayActivity, Project } from "@/lib/types";
import type { TargetStatus } from "@/lib/targets";
import { TargetBadge, TargetWarnings } from "@/components/dashboard/target-warning";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { Ring } from "@/components/ui/ring";
import { Icon } from "@/components/icon";
import { NewProjectForm } from "./project-forms";

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

function TagChips({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className="rounded-md bg-card-hover px-1.5 py-0.5 text-[10px] font-medium text-fg-secondary">
          {tag}
        </span>
      ))}
    </div>
  );
}

function ProjectCard({ p, status }: { p: Project; status?: TargetStatus }) {
  const pct = progressPct(p);
  const isPlanned = p.status === "planned";

  return (
    <Link
      href={`/projects/${p.id}`}
      className="glass group flex flex-col gap-3 rounded-2xl p-5 transition-colors hover:border-border-strong"
    >
      {status && status.level !== "ok" && (
        <TargetBadge
          level={status.level}
          label={status.level === "over" ? "Overdue" : "Behind pace"}
          className="self-start"
        />
      )}
      <div className="flex items-center gap-4">
        <Ring
          value={pct}
          size={84}
          stroke={8}
          from={isPlanned ? "var(--fg-muted)" : "var(--accent-blue)"}
          to={isPlanned ? "var(--fg-muted)" : "var(--accent-cyan)"}
          id={p.id}
        >
          <span className="text-sm font-bold">{pct}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{p.name}</div>
          <div className="text-xs text-fg-muted">{isPlanned ? "Not started" : progressMeta(p)}</div>
          {!isPlanned && p.daysWorked != null && (
            <div className="mt-1 flex items-center gap-1 text-xs text-fg-secondary">
              <Icon name="Flame" size={12} style={{ color: "var(--accent-orange)" }} />
              {p.daysWorked} day{p.daysWorked === 1 ? "" : "s"} logged
            </div>
          )}
        </div>
        <Icon name="ChevronRight" size={16} className="shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5" />
      </div>
      <TagChips tags={p.tags} />
      {p.description && <p className="truncate text-xs text-fg-muted">{p.description}</p>}
    </Link>
  );
}

export function ProjectsView({
  projects,
  activity,
  today,
  statuses = [],
  canLog = false,
}: {
  projects: Project[];
  activity: DayActivity[];
  today: string;
  statuses?: TargetStatus[];
  canLog?: boolean;
}) {
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = [...new Set(projects.flatMap((p) => p.tags ?? []))].sort();

  const filtered = tagFilter
    ? projects.filter((p) => p.tags?.includes(tagFilter))
    : projects;

  const planned = filtered.filter((p) => p.status === "planned");
  const ongoing = filtered.filter((p) => p.status === "ongoing");
  const completed = filtered.filter((p) => p.status === "completed");

  const statusFor = new Map(statuses.map((s) => [s.id, s]));

  const counts = {
    planned: projects.filter((p) => p.status === "planned").length,
    ongoing: projects.filter((p) => p.status === "ongoing").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {counts.ongoing} in progress
          {counts.planned > 0 && ` · ${counts.planned} planned`}
          {counts.completed > 0 && ` · ${counts.completed} completed`}
          {` · ${projects.length} total`}
        </p>
      </header>

      <TargetWarnings statuses={statuses} />

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTagFilter(null)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              !tagFilter ? "bg-accent-blue/20 text-accent-cyan" : "bg-card-hover text-fg-secondary hover:text-fg"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                tagFilter === tag ? "bg-accent-blue/20 text-accent-cyan" : "bg-card-hover text-fg-secondary hover:text-fg"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* In Progress */}
      {(ongoing.length > 0 || canLog) && (
        <div>
          {(planned.length > 0 || completed.length > 0) && (
            <h2 className="mb-3 text-sm font-semibold text-fg-secondary">In progress</h2>
          )}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {ongoing.map((p) => (
              <ProjectCard key={p.id} p={p} status={statusFor.get(`project-${p.id}`)} />
            ))}
            {canLog && <NewProjectForm />}
          </div>
          {canLog && ongoing.length === 0 && !tagFilter && (
            <p className="mt-3 text-center text-sm text-fg-muted">No active projects yet — create one above to start tracking.</p>
          )}
        </div>
      )}

      {/* Planned */}
      {planned.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-fg-secondary">Planned</h2>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {planned.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
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
                  <TagChips tags={p.tags} />
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

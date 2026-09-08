"use client";

import { useState } from "react";
import Link from "next/link";
import type { DayActivity, Project } from "@/lib/types";
import type { TargetStatus } from "@/lib/targets";
import { TargetWarnings } from "@/components/dashboard/target-warning";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { ProjectCard, type ProjectCardData, type ProjectCardStatus } from "@/components/projects/card";

/**
 * The "add one" tile. Creating a project is a whole page now (/projects/new):
 * the AI blueprint, the milestone list and the logo need more room than a card
 * in a grid, so this is a doorway rather than an inline form.
 */
function NewProjectTile() {
  return (
    <Link
      href="/projects/new"
      className="glass group flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-6 text-center transition-colors hover:border-accent-purple/60"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue text-white transition-transform group-hover:scale-105">
        <Icon name="Plus" size={17} />
      </span>
      <span className="text-sm font-medium text-fg-secondary transition-colors group-hover:text-fg">New project</span>
      <span className="text-xs text-fg-muted">Describe it — AI drafts the plan</span>
    </Link>
  );
}

function progressPct(p: Project): number {
  if (p.tasks && p.tasks.length) {
    return Math.round((p.tasks.filter((t) => t.done).length / p.tasks.length) * 100);
  }
  return Math.min(100, Math.round((p.current / Math.max(1, p.targetValue)) * 100));
}

/** Domain status → the card kit's wider status vocabulary. */
const CARD_STATUS: Record<Project["status"], ProjectCardStatus> = {
  planned: "planned",
  ongoing: "in_progress",
  completed: "completed",
};

/**
 * Adapt the domain `Project` to the card kit's presentation shape. This app is
 * single-user with no logos, subtitles or teams, so those fields stay empty and
 * the card falls back to a monogram and drops the team row. Tags carry a generic
 * icon — the shared registry sparkles anything it doesn't recognise.
 */
function toCardData(p: Project): ProjectCardData {
  return {
    id: p.id,
    name: p.name,
    status: CARD_STATUS[p.status],
    progress: progressPct(p),
    daysLogged: p.daysWorked,
    tags: p.tags?.map((name) => ({ name, icon: "Tag" })),
    description: p.description,
  };
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

  const counts = {
    planned: projects.filter((p) => p.status === "planned").length,
    ongoing: projects.filter((p) => p.status === "ongoing").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      <header>
        <h1 className="heading-display text-2xl font-bold">Projects</h1>
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
          <Button
            size="sm"
            hue="cyan"
            selected={!tagFilter}
            onClick={() => setTagFilter(null)}
            faceClassName="px-2.5 py-1 text-xs font-medium"
          >
            All
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              size="sm"
              hue="cyan"
              selected={tagFilter === tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              faceClassName="px-2.5 py-1 text-xs font-medium"
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

      {/* In Progress */}
      {(ongoing.length > 0 || canLog) && (
        <div>
          {(planned.length > 0 || completed.length > 0) && (
            <h2 className="mb-3 text-sm font-semibold text-fg-secondary">In progress</h2>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {ongoing.map((p) => (
              <ProjectCard key={p.id} project={toCardData(p)} />
            ))}
            {canLog && <NewProjectTile />}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {planned.map((p) => (
              <ProjectCard key={p.id} project={toCardData(p)} />
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

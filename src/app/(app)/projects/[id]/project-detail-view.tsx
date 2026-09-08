"use client";

/*
  The Project Details page — a single-scroll bento grid.

  It wears the redesigned detail kit (`components/projects/detail`): the header
  with logo + meta, the overall-progress card, the overview stat cards and the
  start→today→target timeline, and the three insight cards (Goals / Key Features
  / Problems). Every interactive affordance is still the app's own working
  component from `project-forms.tsx`: the milestone checklist, the AI milestone
  generator, the dated update ("commit") composer and timeline, and the
  status / tags / rename-delete controls.

  Layout, top to bottom:
    1. Header (logo, title, idea, category/type/dates)  +  Overall progress   ← row 1
    2. Project Overview (stats + timeline)                                     ← full width
    3. Goals · Key Features · Problems                                         ← 3-up
    4. Milestones (interactive)                                                ← full width
    then, when writing is possible: Progress updates, Activity, Settings.

  The kit is presentation-only and domain-free; this file is the seam that feeds
  it real `Project` data. Where a field has no source the mapping leaves it out
  rather than inventing it (a monogram for the missing logo, an "Open-ended"
  target when there is no finish date, and insight cards that hide when empty).
*/

import Link from "next/link";
import type { DayActivity, Project } from "@/lib/types";
import type { TargetStatus } from "@/lib/targets";
import { TargetWarning } from "@/components/dashboard/target-warning";
import { addDays, parseDay, shortDate } from "@/lib/dates";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { Icon } from "@/components/icon";
import { clamp } from "@/lib/utils";
import {
  ProjectDetailHeader,
  ProjectInsightsGrid,
  ProjectProgressCard,
  ProjectStatsGrid,
  ProjectTimeline,
  SectionCard,
  type CompactStatData,
  type ProjectCardStatus,
  type ProjectMeta,
  type ProjectStat,
  type ProjectTimelineData,
} from "@/components/projects/detail";
import {
  CommitComposer,
  CommitTimeline,
  MilestoneGenerator,
  ProjectSettings,
  StatusControl,
  TagEditor,
  TaskAdder,
  TaskRow,
} from "../project-forms";

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

/**
 * Keep the Goals card to its first few sentences. A saved brief can run long,
 * and the row-3 grid stretches all three cards to the tallest one — so an
 * unbounded Goals blurb makes the whole row tall and leaves Key Features and
 * Problems padded with empty space. Capping it here keeps Goals glanceable and
 * the same height as the two cards beside it. Splits after sentence-ending
 * punctuation; text without any is left as-is rather than cut mid-thought.
 */
function firstSentences(text: string, max: number): string {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, max).join(" ");
}

/** Domain status → the detail/card kit's wider status vocabulary. */
const CARD_STATUS: Record<Project["status"], ProjectCardStatus> = {
  planned: "planned",
  ongoing: "in_progress",
  completed: "completed",
};

/** A glass section with the kit's heading treatment, used by the full-width cards. */
function BentoSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <SectionCard className="p-4 sm:p-5 lg:p-6">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-fg sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">{subtitle}</p>}
      </div>
      <div className="mt-4 sm:mt-5">{children}</div>
    </SectionCard>
  );
}

export function ProjectDetailView({
  project,
  activity,
  today,
  status = null,
  canLog = false,
  aiReady = false,
}: {
  project: Project;
  activity: DayActivity[];
  today: string;
  status?: TargetStatus | null;
  canLog?: boolean;
  aiReady?: boolean;
}) {
  const cardStatus = CARD_STATUS[project.status];
  const tasks = project.tasks ?? [];
  const commits = project.commits ?? [];
  const daysWorked = project.daysWorked ?? 0;
  const doneCount = tasks.filter((t) => t.done).length;
  const openMilestoneCount = tasks.length - doneCount;
  const pct = progressPct(project);

  // The header blurb is the AI-distilled idea paragraph; the long-form brief is
  // its own "Goals" card below. `hasIdea` gates the milestone generator, which
  // works from that saved brief.
  const goals = (project.goals ?? "").trim();
  const hasIdea = goals.length > 0;
  // The card is a glanceable brief, not the whole document — cap it at 3–4
  // sentences so it stays as compact (and as tall) as its neighbours in row 3.
  const goalsBrief = firstSentences(goals, 4);
  const headerBlurb = (project.idea ?? "").trim() || project.description || "";

  const daysLeft = project.targetDate ? daysBetween(today, project.targetDate) : null;
  const milestoneValue = tasks.length ? `${doneCount}/${tasks.length}` : "—";

  const meta: ProjectMeta[] = [
    ...(project.category
      ? [{ icon: "LayoutDashboard", label: "Category", value: project.category } as ProjectMeta]
      : []),
    ...(project.type ? [{ icon: "Code", label: "Type", value: project.type } as ProjectMeta] : []),
    { icon: "Calendar", label: "Started", value: shortDate(project.startDate) },
    ...(project.targetDate
      ? [{ icon: "Target", label: "Target", value: shortDate(project.targetDate) } as ProjectMeta]
      : []),
    { icon: "Flame", label: "Days worked", value: `${daysWorked}` },
  ];

  const progressStats: CompactStatData[] = [
    { icon: "Flame", label: "Days worked", value: `${daysWorked}`, accent: "var(--accent-orange)" },
    {
      icon: "Clock",
      label: daysLeft == null ? "Timeline" : daysLeft < 0 ? "Overdue" : "Days left",
      value: daysLeft == null ? "Open" : `${Math.abs(daysLeft)}d`,
      accent: "var(--accent-blue)",
    },
    { icon: "Target", label: "Milestones", value: milestoneValue, accent: "var(--accent-mint)" },
    { icon: "PenLine", label: "Updates", value: `${commits.length}`, accent: "var(--accent-purple)" },
  ];

  const stats: ProjectStat[] = [
    {
      icon: "Target",
      label: "Milestones",
      value: `${doneCount}`,
      total: tasks.length ? `${tasks.length}` : undefined,
      helper: "Completed",
      variant: "green",
    },
    { icon: "PenLine", label: "Updates", value: `${commits.length}`, helper: "Logged", variant: "orange" },
    { icon: "Activity", label: "Completion", value: `${pct}%`, helper: "Overall progress", variant: "blue" },
    { icon: "Flame", label: "Days worked", value: `${daysWorked}`, helper: "Total days", variant: "purple" },
  ];

  // Where "today" sits on the rail: time-elapsed toward the finish date when
  // there is one, else fall back to completion so the marker still means
  // something on an open-ended project.
  const span = project.targetDate ? Math.max(1, daysBetween(project.startDate, project.targetDate)) : null;
  const timelineProgress = span
    ? clamp(Math.round((daysBetween(project.startDate, today) / span) * 100), 0, 100)
    : pct;
  const timeline: ProjectTimelineData = {
    start: { label: "Started", date: shortDate(project.startDate) },
    today: { label: "Today", date: shortDate(today) },
    target: project.targetDate
      ? { label: "Target", date: shortDate(project.targetDate) }
      : { label: "Target", date: "Open-ended" },
    progress: timelineProgress,
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="space-y-5 md:space-y-6 lg:space-y-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-fg-secondary transition-colors hover:text-fg"
        >
          <Icon name="ChevronLeft" size={16} />
          All projects
        </Link>

        {status && status.level !== "ok" && <TargetWarning status={status} />}

        {/* Row 1 — header + overall progress */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(300px,26vw,360px)] lg:gap-6">
          <ProjectDetailHeader
            name={project.name}
            status={cardStatus}
            description={headerBlurb}
            logo={project.logoUrl}
            meta={meta}
          />
          <ProjectProgressCard progress={pct} progressStats={progressStats} />
        </div>

        {/* Row 2 — project overview (full width) */}
        <SectionCard className="p-4 sm:p-5 lg:p-6">
          <h2 className="text-lg font-semibold text-fg sm:text-xl">Project Overview</h2>
          <ProjectStatsGrid stats={stats} className="mt-4 sm:mt-5" />
          <div className="mt-6 border-t border-border pt-8 lg:pt-9">
            <ProjectTimeline data={timeline} />
          </div>
        </SectionCard>

        {/* Row 3 — Goals · Key Features · Problems */}
        <ProjectInsightsGrid
          insights={{
            goals: goalsBrief,
            features: project.keyFeatures ?? [],
            problems: project.problems ?? [],
          }}
        />

        {/* Row 4 — milestones (interactive, full width) */}
        <BentoSection
          title="Milestones & tasks"
          subtitle={tasks.length ? `${doneCount} of ${tasks.length} done` : "What you're aiming to achieve"}
        >
          {tasks.length > 0 ? (
            <ul className="space-y-2.5">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} canLog={canLog} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">
              {canLog ? "No milestones yet — add the first one below." : "No milestones yet."}
            </p>
          )}
          {canLog && <TaskAdder projectId={project.id} />}
          {canLog && <MilestoneGenerator projectId={project.id} hasIdea={hasIdea} aiReady={aiReady} />}
        </BentoSection>

        {/* Progress updates */}
        <BentoSection
          title="Progress updates"
          subtitle={`${commits.length} update${commits.length === 1 ? "" : "s"} · ${daysWorked} day${
            daysWorked === 1 ? "" : "s"
          } worked`}
        >
          {canLog && (
            <div className="mb-4">
              <CommitComposer
                projectId={project.id}
                today={today}
                yesterday={addDays(today, -1)}
                hasOpenMilestones={openMilestoneCount > 0}
                aiReady={aiReady}
              />
            </div>
          )}
          <CommitTimeline commits={commits} projectId={project.id} canLog={canLog} />
        </BentoSection>

        {/* Activity */}
        <BentoSection title="Project activity" subtitle="Days you moved this project forward">
          <ActivityHeatmap activity={activity} section="projects" today={today} />
        </BentoSection>

        {/* Settings — only where writing is possible */}
        {canLog && (
          <BentoSection title="Project settings" subtitle="Status, tags, and the project itself">
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-medium text-fg-secondary">Status</p>
                <StatusControl project={project} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-fg-secondary">Tags</p>
                <TagEditor project={project} />
              </div>
              <div className="border-t border-border pt-5">
                <p className="mb-2 text-xs font-medium text-fg-secondary">Manage</p>
                <ProjectSettings project={project} />
              </div>
            </div>
          </BentoSection>
        )}
      </div>
    </div>
  );
}

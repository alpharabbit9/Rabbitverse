/*
  The shape the Project Details page renders.

  Kept as its own presentation contract — the same reasoning as the card kit's
  `types.ts`: this view should be drivable by anything that can produce these
  fields (the real `/projects/[id]` loader, a preview fixture, a Storybook
  story) without dragging the domain `Project` model along. It reuses the card
  kit's `ProjectCardStatus` for the header pill so the two kits agree on what a
  project's status *is*, but nothing else here depends on the domain layer.
*/

import type { ProjectCardStatus } from "../card/types";

export type { ProjectCardStatus };

/** A milestone's own lifecycle — narrower than a project's, plus "blocked". */
export type MilestoneStatus = "completed" | "in_progress" | "planned" | "blocked";

/** One labelled fact in the header's metadata strip. */
export interface ProjectMeta {
  /** A name from the shared registry in `components/icon.tsx`. */
  icon: string;
  label: string;
  value: string;
}

/** A colour lane for the overview stat cards — a name, resolved to a token. */
export type StatVariant = "purple" | "green" | "blue" | "orange" | "cyan";

/** One card in the overview statistics grid. */
export interface ProjectStat {
  icon: string;
  label: string;
  /** The headline figure — "18", "32%", "6". */
  value: string;
  /** Optional denominator, greyed after a slash — "56" renders "18 / 56". */
  total?: string;
  helper: string;
  variant: StatVariant;
}

/** One tile in the progress card's 2×2 grid. */
export interface CompactStat {
  icon: string;
  label: string;
  value: string;
  /** A token or literal colour for the icon. */
  accent: string;
}

/** A single marker on the start → today → target rail. */
export interface TimelinePoint {
  label: string;
  date: string;
}

export interface ProjectTimelineData {
  start: TimelinePoint;
  today: TimelinePoint;
  target: TimelinePoint;
  /** 0–100: where "today" sits between start and target, and how far the
      completed (green) portion of the rail reaches. */
  progress: number;
}

/** The three information cards, as data. */
export interface ProjectInsights {
  /** The long-form brief — shown as the "Goals" card. */
  goals: string;
  features: string[];
  problems: string[];
}

export interface Milestone {
  id: string | number;
  title: string;
  description: string;
  /** Display labels, not ISO dates — the page never parses these. */
  start: string;
  end: string;
  status: MilestoneStatus;
  /** 0–100. */
  progress: number;
}

/** Everything the Project Details page needs to render. */
export interface ProjectDetailData {
  id: string;
  name: string;
  status: ProjectCardStatus;
  description: string;
  /** Any URL the browser can load; falls back to a monogram when absent. */
  logo?: string;
  /** 0–100 overall completion, shown in the progress ring. */
  progress: number;
  meta: ProjectMeta[];
  /** The four progress-card tiles (days worked / left, milestones, tasks). */
  progressStats: CompactStat[];
  /** The overview grid cards. */
  stats: ProjectStat[];
  timeline: ProjectTimelineData;
  insights: ProjectInsights;
  milestones: Milestone[];
}

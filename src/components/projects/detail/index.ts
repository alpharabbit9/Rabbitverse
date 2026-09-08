/* The Project Details page, and the reusable parts it is made of. */

export { ProjectDetail } from "./project-detail";
export { ProjectDetailHeader } from "./project-header";
export { ProjectMetaItem } from "./meta-item";
export { ProjectProgressCard } from "./progress-card";
export { CompactStat } from "./compact-stat";
export { ProjectTabs, DEFAULT_PROJECT_TABS } from "./project-tabs";
export { ProjectStatsGrid } from "./stats-grid";
export { ProjectStatCard } from "./stat-card";
export { ProjectTimeline } from "./timeline";
export { ProjectInsightsGrid } from "./insights-grid";
export { MilestonesSection } from "./milestones-section";
export { MilestoneProgress } from "./milestone-progress";
export { StatusBadge, statusColor } from "./status-badge";
export { SectionCard, type SectionCardVariant } from "./section-card";
export type {
  ProjectDetailData,
  ProjectMeta,
  ProjectStat,
  StatVariant,
  CompactStat as CompactStatData,
  ProjectTimelineData,
  TimelinePoint,
  ProjectInsights,
  Milestone,
  MilestoneStatus,
  ProjectCardStatus,
} from "./types";

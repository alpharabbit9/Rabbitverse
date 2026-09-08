/*
  The Project Details page, composed.

  Responsive from the container outward: a centred max-width shell with padding
  that grows by breakpoint, and vertical rhythm that opens up on larger screens.
  The header and the overall-progress card share a two-column grid on `lg`
  (`minmax(0,1fr)` + a fluid-but-bounded right column) and stack on smaller
  screens, which is what drops the progress card below the project information
  on mobile. Everything below is full-width and reflows on its own.

  This is a server component — none of its own markup needs the client; the few
  interactive children ("use client") opt in for themselves.
*/

import { ProjectDetailHeader } from "./project-header";
import { ProjectProgressCard } from "./progress-card";
import { ProjectTabs } from "./project-tabs";
import { SectionCard } from "./section-card";
import { ProjectStatsGrid } from "./stats-grid";
import { ProjectTimeline } from "./timeline";
import { ProjectInsightsGrid } from "./insights-grid";
import { MilestonesSection } from "./milestones-section";
import type { ProjectDetailData } from "./types";

export function ProjectDetail({ data }: { data: ProjectDetailData }) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10">
      <div className="space-y-5 md:space-y-6 lg:space-y-8">
        {/* Header + overall progress */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(300px,26vw,360px)] lg:gap-6">
          <ProjectDetailHeader
            name={data.name}
            status={data.status}
            description={data.description}
            logo={data.logo}
            meta={data.meta}
          />
          <ProjectProgressCard progress={data.progress} progressStats={data.progressStats} />
        </div>

        <ProjectTabs />

        {/* Overview: statistics + timeline */}
        <SectionCard className="p-4 sm:p-5 lg:p-6">
          <h2 className="text-lg font-semibold text-fg sm:text-xl">Project Overview</h2>
          <ProjectStatsGrid stats={data.stats} className="mt-4 sm:mt-5" />
          <div className="mt-6 border-t border-border pt-8 lg:pt-9">
            <ProjectTimeline data={data.timeline} />
          </div>
        </SectionCard>

        <ProjectInsightsGrid insights={data.insights} />

        <MilestonesSection milestones={data.milestones} />
      </div>
    </div>
  );
}

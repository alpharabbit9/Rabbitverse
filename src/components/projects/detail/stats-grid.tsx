/*
  The overview statistics — four cards that reflow 2-up on phones and small
  tablets, 4-up from `lg`. Every card is `min-w-0` so a long value truncates
  instead of forcing the row wider than its column.
*/

import { ProjectStatCard } from "./stat-card";
import type { ProjectStat } from "./types";
import { cn } from "@/lib/utils";

export function ProjectStatsGrid({ stats, className }: { stats: ProjectStat[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>
      {stats.map((s) => (
        <ProjectStatCard key={s.label} {...s} />
      ))}
    </div>
  );
}

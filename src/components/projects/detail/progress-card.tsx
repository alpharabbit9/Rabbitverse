/*
  The overall-progress card that sits to the right of the header on desktop and
  drops below it on mobile. A circular ring (the card kit's fluid `ProgressRing`,
  so it scales with its box) over a 2×2 grid of compact stats.

  The ring's accent follows completion: mint once finished, violet-to-blue while
  in flight — the same "100 changes what this means" idea the card kit uses.
*/

import { Icon } from "@/components/icon";
import { ProgressRing } from "../card/progress-ring";
import { CompactStat } from "./compact-stat";
import type { ProjectDetailData } from "./types";

export function ProjectProgressCard({
  progress,
  progressStats,
}: Pick<ProjectDetailData, "progress" | "progressStats">) {
  const complete = progress >= 100;
  const accent = complete ? "var(--accent-mint)" : "var(--accent-purple)";
  const statusLabel = complete ? "Complete" : progress > 0 ? "In progress" : "Not started";

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-4 sm:p-5 lg:p-6">
      <div className="flex items-center gap-4 sm:gap-5">
        <ProgressRing value={progress} accent={accent} id="detail-overall" className="size-20 shrink-0 sm:size-24">
          {complete && <Icon name="Check" size={28} strokeWidth={3} style={{ color: accent }} />}
        </ProgressRing>

        <div className="min-w-0">
          <p className="text-xs text-fg-muted sm:text-sm">Overall Progress</p>
          <p className="number-display mt-0.5 text-3xl font-bold text-fg sm:text-4xl" style={{ color: accent }}>
            {progress}%
          </p>
          <span className="sr-only">{progress}% overall progress.</span>
          <p className="mt-0.5 text-xs font-medium" style={{ color: complete ? accent : "var(--fg-muted)" }}>
            {statusLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:mt-5 sm:pt-5">
        {progressStats.map((s) => (
          <CompactStat key={s.label} {...s} />
        ))}
      </div>
    </div>
  );
}

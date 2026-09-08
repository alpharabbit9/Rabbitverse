"use client";

/*
  The milestone tracker.

  Layout is built mobile-first and *restructured* — not shrunk — at `xl`, where
  the content becomes a single row (title/description, then a right-aligned
  cluster of dates · status · progress · menu). Below `xl` that cluster wraps and
  the progress bar drops to its own full-width line. Every column is `min-w-0`
  and long text truncates or wraps, so nothing forces horizontal page scroll.

  The connecting line lives inside each row rather than as page-level absolute
  elements: each row draws a vertical segment above and/or below its indicator,
  anchored to the indicator's own geometry (dot at `mt-4`, so its centre is 30px
  down a `size-7` circle). Rows are contiguous (no vertical gap, a hairline
  border instead), so adjacent segments meet exactly regardless of how tall a
  description makes any given row. A segment is green when it descends from a
  completed milestone, so the "done" stretch of the line reads green like the
  reference.
*/

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { MilestoneProgress } from "./milestone-progress";
import type { Milestone } from "./types";
import { cn } from "@/lib/utils";

function DateRange({ start, end, className }: { start: string; end: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 whitespace-nowrap text-xs text-fg-muted", className)}>
      <Icon name="Calendar" size={13} className="shrink-0" />
      {start === end ? start : `${start} – ${end}`}
    </span>
  );
}

function Indicator({ milestone, index }: { milestone: Milestone; index: number }) {
  const { status } = milestone;

  if (status === "completed") {
    return (
      <span
        className="relative z-10 mt-4 grid size-7 shrink-0 place-items-center rounded-full text-[color:var(--bg)]"
        style={{ background: "var(--accent-mint)", boxShadow: "0 0 12px color-mix(in srgb, var(--accent-mint) 55%, transparent)" }}
      >
        <Icon name="Check" size={15} strokeWidth={3} />
      </span>
    );
  }

  const style: Record<Milestone["status"], { bg: string; fg: string; border?: string }> = {
    completed: { bg: "", fg: "" },
    in_progress: { bg: "var(--accent-purple)", fg: "#fff" },
    blocked: { bg: "var(--accent-rose)", fg: "#fff" },
    planned: { bg: "var(--surface)", fg: "var(--fg-muted)", border: "var(--border-strong)" },
  };
  const s = style[status];

  return (
    <span
      className="relative z-10 mt-4 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums"
      style={{
        background: s.bg,
        color: s.fg,
        border: s.border ? `2px solid ${s.border}` : undefined,
        boxShadow: status === "in_progress" ? "0 0 12px color-mix(in srgb, var(--accent-purple) 55%, transparent)" : undefined,
      }}
    >
      {index + 1}
    </span>
  );
}

function MilestoneItem({
  milestone,
  index,
  isFirst,
  isLast,
  prevCompleted,
}: {
  milestone: Milestone;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  prevCompleted: boolean;
}) {
  const completed = milestone.status === "completed";
  const green = "var(--accent-mint)";
  const line = "var(--border)";

  return (
    <li className={cn("relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4", !isFirst && "border-t border-border")}>
      {/* Indicator column, with the connecting segments. */}
      <div className="relative flex justify-center">
        {!isFirst && (
          <span
            aria-hidden
            className="absolute left-1/2 top-0 h-[30px] w-px -translate-x-1/2"
            style={{ background: prevCompleted ? green : line }}
          />
        )}
        {!isLast && (
          <span
            aria-hidden
            className="absolute left-1/2 bottom-0 top-[30px] w-px -translate-x-1/2"
            style={{ background: completed ? green : line }}
          />
        )}
        <Indicator milestone={milestone} index={index} />
      </div>

      {/* Content column. */}
      <div className="min-w-0 pt-4 pb-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-5">
          <div className="min-w-0 xl:flex-1">
            <h4 className="truncate text-sm font-semibold text-fg">{milestone.title}</h4>
            <p className="mt-0.5 text-xs leading-5 text-fg-secondary line-clamp-2">{milestone.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 xl:flex-nowrap xl:justify-end">
            <DateRange start={milestone.start} end={milestone.end} className="xl:w-32 xl:justify-end" />
            <StatusBadge status={milestone.status} className="xl:w-[104px] xl:justify-center" />
            <MilestoneProgress value={milestone.progress} status={milestone.status} className="w-full xl:w-44" />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${milestone.title}`}
              className="shrink-0"
            >
              <Icon name="MoreHorizontal" size={16} />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function MilestonesSection({ milestones, className }: { milestones: Milestone[]; className?: string }) {
  const completedCount = milestones.filter((m) => m.status === "completed").length;

  return (
    <section className={cn("glass rounded-2xl p-4 sm:p-5 lg:p-6", className)} aria-labelledby="milestones-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="milestones-heading" className="text-lg font-semibold text-fg sm:text-xl">
            Milestones
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">
            {milestones.length} milestone{milestones.length === 1 ? "" : "s"} · {completedCount} completed
          </p>
        </div>
        <Button variant="primary" hue="purple" className="w-full sm:w-auto" faceClassName="gap-2">
          <Icon name="Plus" size={16} />
          Add Milestone
        </Button>
      </div>

      <ol className="mt-4 sm:mt-5">
        {milestones.map((m, i) => (
          <MilestoneItem
            key={m.id}
            milestone={m}
            index={i}
            isFirst={i === 0}
            isLast={i === milestones.length - 1}
            prevCompleted={i > 0 && milestones[i - 1].status === "completed"}
          />
        ))}
      </ol>

      <div className="mt-2 border-t border-border pt-3">
        <Button variant="ghost" hue="purple" block faceClassName="gap-2 justify-center text-fg-secondary">
          <Icon name="Plus" size={16} />
          Add new milestone
        </Button>
      </div>
    </section>
  );
}

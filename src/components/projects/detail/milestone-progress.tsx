"use client";

/*
  A milestone's progress bar. The fill takes the milestone's own status colour
  (mint when done, violet in progress, muted when planned), animates in from
  zero on mount, and respects a reduced-motion preference.

  The number beside it is the accessible truth; the bar is `aria-hidden`.
*/

import { motion, useReducedMotion } from "motion/react";
import { statusColor } from "./status-badge";
import type { MilestoneStatus } from "./types";
import { clamp, cn } from "@/lib/utils";

export function MilestoneProgress({
  value,
  status,
  className,
}: {
  value: number;
  status: MilestoneStatus;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const pct = clamp(value, 0, 100);
  const color = statusColor(status);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-fg-secondary">{pct}%</span>
      <div
        aria-hidden
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]"
        style={{ ["--track" as string]: "color-mix(in srgb, var(--fg) 10%, transparent)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}55` }}
          initial={{ width: reduceMotion ? `${pct}%` : 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

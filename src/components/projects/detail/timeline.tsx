"use client";

/*
  The start → today → target rail.

  Positions are percentages derived from the data (today sits at `progress`%
  between start and target), not hardcoded pixel offsets — so the "today" marker
  and the green fill move together with the number and nothing has to be
  re-nudged by hand. Start pins to the left edge, target to the right, today
  translates by half its own width; that keeps every marker inside the track at
  any width. Labels stack under their markers and align outward at the ends so
  they never spill past the container.

  The completed portion of the rail is green, the current marker violet, the
  target a neutral hollow ring — colour is backed by an icon and the visible
  date, never the only signal.
*/

import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/icon";
import type { ProjectTimelineData } from "./types";
import { clamp, cn } from "@/lib/utils";

type Kind = "done" | "current" | "upcoming";

function Marker({ kind }: { kind: Kind }) {
  if (kind === "done") {
    return (
      <span
        className="grid size-5 place-items-center rounded-full text-[color:var(--bg)]"
        style={{ background: "var(--accent-mint)", boxShadow: "0 0 12px var(--accent-mint)" }}
      >
        <Icon name="Check" size={12} strokeWidth={3} />
      </span>
    );
  }
  if (kind === "current") {
    return (
      <span
        className="grid size-5 place-items-center rounded-full ring-4 ring-[color:color-mix(in_srgb,var(--accent-blue)_28%,transparent)]"
        style={{ background: "var(--accent-blue)", boxShadow: "0 0 14px var(--accent-blue)" }}
      >
        <span className="size-1.5 rounded-full bg-white/90" />
      </span>
    );
  }
  return <span className="size-5 rounded-full border-2 border-border-strong bg-[color:var(--surface)]" />;
}

export function ProjectTimeline({ data, className }: { data: ProjectTimelineData; className?: string }) {
  const reduceMotion = useReducedMotion();
  const pct = clamp(data.progress, 0, 100);

  const points: { pt: { label: string; date: string }; at: number; kind: Kind }[] = [
    { pt: data.start, at: 0, kind: "done" },
    { pt: data.today, at: pct, kind: "current" },
    { pt: data.target, at: 100, kind: "upcoming" },
  ];

  return (
    <div className={cn("relative", className)}>
      {/* Rail */}
      <div className="relative mx-2.5 h-1.5 rounded-full" style={{ background: "color-mix(in srgb, var(--fg) 10%, transparent)" }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: "var(--accent-mint)", boxShadow: "0 0 10px color-mix(in srgb, var(--accent-mint) 60%, transparent)" }}
          initial={{ width: reduceMotion ? `${pct}%` : 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduceMotion ? 0 : 1, ease: "easeOut" }}
        />
        {points.map(({ at, kind }, i) => (
          <span
            key={i}
            className="absolute top-1/2"
            style={{
              left: `${at}%`,
              transform: `translate(${at === 0 ? "-2.5px" : at === 100 ? "calc(-100% + 2.5px)" : "-50%"}, -50%)`,
            }}
          >
            <Marker kind={kind} />
          </span>
        ))}
      </div>

      {/* Labels */}
      <div className="relative mt-4 h-9">
        {points.map(({ pt, at }, i) => (
          <div
            key={i}
            className={cn(
              "absolute top-0 flex w-28 flex-col gap-0.5",
              at === 0 && "items-start text-left",
              at === 100 && "items-end text-right",
              at !== 0 && at !== 100 && "items-center text-center",
            )}
            style={{
              left: `${at}%`,
              transform: at === 0 ? "translateX(0)" : at === 100 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            <span className="text-xs font-medium text-fg">{pt.label}</span>
            <span className="text-xs text-fg-muted">{pt.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

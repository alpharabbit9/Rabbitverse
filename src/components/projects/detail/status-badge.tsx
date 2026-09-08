/*
  A milestone's status, as a word + a dot + a derived tint.

  Same discipline as the card kit's `ProjectStatus`: the label carries the
  meaning, colour is decoration, and every tint comes from one token so it is
  right in both themes. A milestone has one status the project pill does not —
  "blocked" — so this is its own map rather than a reuse of `PROJECT_STATUS`.
*/

import { tint } from "../card/status";
import type { MilestoneStatus } from "./types";
import { cn } from "@/lib/utils";

const MILESTONE_STATUS: Record<MilestoneStatus, { label: string; color: string }> = {
  completed: { label: "Completed", color: "var(--accent-mint)" },
  in_progress: { label: "In progress", color: "var(--accent-purple)" },
  planned: { label: "Planned", color: "var(--fg-muted)" },
  blocked: { label: "Blocked", color: "var(--accent-rose)" },
};

export function statusColor(status: MilestoneStatus): string {
  return MILESTONE_STATUS[status].color;
}

export function StatusBadge({ status, className }: { status: MilestoneStatus; className?: string }) {
  const { label, color } = MILESTONE_STATUS[status];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        className,
      )}
      style={{
        borderColor: tint(color, 30),
        backgroundColor: tint(color, 12),
        color: tint(color, 64, "var(--fg)"),
      }}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

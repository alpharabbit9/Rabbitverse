/*
  The status pill. A dot, a word, and a tint derived from the one status colour.

  The word is the point: colour is decoration here, and "Completed" has to reach
  someone who cannot tell mint from gold.
*/

import { PROJECT_STATUS, tint } from "./status";
import type { ProjectCardStatus } from "./types";
import { cn } from "@/lib/utils";

export function ProjectStatus({ status, className }: { status: ProjectCardStatus; className?: string }) {
  const { label, color } = PROJECT_STATUS[status] ?? PROJECT_STATUS.planned;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md @lg/pcard:px-3.5 @lg/pcard:py-1.5 @lg/pcard:text-sm",
        className,
      )}
      style={{
        borderColor: tint(color, 32),
        backgroundColor: tint(color, 12),
        // 62% accent against the foreground: a light lavender on dark, a deep
        // one on light. Contrast survives either way.
        color: tint(color, 62, "var(--fg)"),
      }}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full @lg/pcard:size-2"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${tint(color, 85)}` }}
      />
      {label}
    </span>
  );
}

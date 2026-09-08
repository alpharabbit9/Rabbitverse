"use client";

/*
  Progress: the ring, the numbers beside it, and the streak underneath.

  The percentage is shown twice on purpose — once inside the ring, once as
  "32 / 100%" — which is exactly the kind of thing a screen reader should not
  have to sit through, so both are hidden from it and one plain sentence is
  offered instead.

  At 100 the section changes its mind about what it is reporting: "Overall
  Progress" becomes "Complete", and the caller has already swapped the accent to
  mint. Nothing else in the card needs a special case for a finished project.
*/

import { Icon } from "@/components/icon";
import { ProgressRing } from "./progress-ring";
import { cn } from "@/lib/utils";

export function ProjectProgress({
  progress,
  daysLogged,
  accent,
  id,
  className,
}: {
  /** Already clamped and rounded by the card. */
  progress: number;
  daysLogged?: number;
  accent: string;
  id: string;
  className?: string;
}) {
  const complete = progress >= 100;
  const days = daysLogged ?? 0;

  return (
    <div className={cn("flex items-center gap-4 @lg/pcard:gap-5 @5xl/pcard:gap-7", className)}>
      <ProgressRing value={progress} accent={accent} id={id} className="size-24 @lg/pcard:size-32 @5xl/pcard:size-40">
        <span aria-hidden className="number-display flex items-baseline">
          <span className="text-xl font-bold @lg/pcard:text-2xl @5xl/pcard:text-[2rem]">{progress}</span>
          <span className="text-[11px] font-semibold text-fg-secondary @lg/pcard:text-sm @5xl/pcard:text-base">%</span>
        </span>
      </ProgressRing>

      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs text-fg-secondary @lg/pcard:text-sm @5xl/pcard:text-lg">
          {complete && <Icon name="CheckCircle2" size={16} style={{ color: "var(--accent-mint)" }} />}
          {complete ? "Complete" : "Overall Progress"}
        </p>

        <p aria-hidden className="number-display mt-0.5 flex items-baseline gap-1.5 @5xl/pcard:mt-1.5">
          <span className="text-xl font-bold @lg/pcard:text-2xl @5xl/pcard:text-[2rem]" style={{ color: accent }}>
            {progress}
          </span>
          <span className="text-base text-fg-muted @lg/pcard:text-lg @5xl/pcard:text-2xl">/ 100%</span>
        </p>
        <span className="sr-only">{progress}% complete.</span>

        {days > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-secondary @lg/pcard:text-sm @5xl/pcard:mt-2.5 @5xl/pcard:gap-2 @5xl/pcard:text-base">
            <Icon
              name="Flame"
              size={16}
              className="shrink-0 @5xl/pcard:size-5"
              style={{ color: "var(--accent-orange)", filter: "drop-shadow(0 0 6px rgba(255, 177, 94, 0.5))" }}
            />
            {days} day{days === 1 ? "" : "s"} logged
          </p>
        )}
      </div>
    </div>
  );
}

/*
  A single tile in the progress card's 2×2 grid: an accent icon, a bold value,
  a muted label. Reused four times (days worked / days left / milestones / tasks).
*/

import { Icon } from "@/components/icon";
import { tint } from "../card/status";
import type { CompactStat as CompactStatData } from "./types";
import { cn } from "@/lib/utils";

export function CompactStat({ icon, label, value, accent, className }: CompactStatData & { className?: string }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-border bg-[color:var(--tile)] p-3",
        className,
      )}
      style={{ ["--tile" as string]: "color-mix(in srgb, var(--fg) 3%, transparent)" }}
    >
      <span
        className="grid size-7 place-items-center rounded-lg"
        style={{ backgroundColor: tint(accent, 14), color: accent }}
      >
        <Icon name={icon} size={15} />
      </span>
      <p className="mt-2 truncate text-base font-semibold tabular-nums leading-none text-fg">{value}</p>
      <p className="mt-1 truncate text-xs text-fg-muted">{label}</p>
    </div>
  );
}

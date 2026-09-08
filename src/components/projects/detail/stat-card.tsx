/*
  One overview statistic — icon, value, label, helper — in its own accent lane.

  The value can carry a quiet denominator ("18 / 56"): pass it split as
  `value` + `total` and the card greys the total, or pass a whole string as
  `value` and leave `total` off. Either way the card owns the styling, not the
  caller.
*/

import { Icon } from "@/components/icon";
import { tint } from "../card/status";
import type { ProjectStat, StatVariant } from "./types";
import { cn } from "@/lib/utils";

const VARIANT: Record<StatVariant, string> = {
  purple: "var(--accent-purple)",
  green: "var(--accent-mint)",
  blue: "var(--accent-blue)",
  orange: "var(--accent-orange)",
  cyan: "var(--accent-cyan)",
};

export function ProjectStatCard({
  icon,
  label,
  value,
  total,
  helper,
  variant,
  className,
}: ProjectStat & { total?: string; className?: string }) {
  const accent = VARIANT[variant];

  return (
    <div
      className={cn(
        "group min-w-0 rounded-2xl border border-border bg-[color:var(--card-solid)] p-4 transition-colors duration-300 hover:border-border-strong sm:p-5",
        className,
      )}
    >
      <span
        className="grid size-9 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundColor: tint(accent, 15), color: accent }}
      >
        <Icon name={icon} size={18} />
      </span>

      <p className="mt-3 truncate text-xs font-medium text-fg-secondary sm:text-sm">{label}</p>

      <p className="number-display mt-1 flex items-baseline gap-1 text-2xl font-bold leading-none text-fg">
        <span className="truncate">{value}</span>
        {total && <span className="text-base font-semibold text-fg-muted">/ {total}</span>}
      </p>

      <p className="mt-1.5 truncate text-xs text-fg-muted">{helper}</p>
    </div>
  );
}

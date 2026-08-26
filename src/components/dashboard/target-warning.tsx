/*
  The one place a TargetStatus becomes pixels. Three shapes over the same data:
    · TargetBadge    — a level pill for a card corner
    · TargetWarning  — one banner row (label + the numbers behind it)
    · TargetWarnings — the non-ok ones stacked, worst first (renders nothing
                       when everything is on track)
  Server-safe: no state, no effects, so section server pages can render it.
*/
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { attentionStatuses, type TargetLevel, type TargetStatus } from "@/lib/targets";

/** Level → accent / icon / one-word verdict. Exported so other surfaces can
 *  colour themselves from a status instead of inventing a second rule. */
export const LOOK: Record<TargetLevel, { accent: string; icon: string; word: string }> = {
  ok: { accent: "var(--accent-mint)", icon: "CheckCircle2", word: "On track" },
  warn: { accent: "var(--accent-orange)", icon: "TrendingUp", word: "Heads up" },
  over: { accent: "var(--accent-rose)", icon: "TrendingDown", word: "Off track" },
};

/** Small level pill — for a section card's corner. */
export function TargetBadge({ level, label, className }: { level: TargetLevel; label?: string; className?: string }) {
  const look = LOOK[level];
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", className)}
      style={{ background: `color-mix(in oklab, ${look.accent} 16%, transparent)`, color: look.accent }}
    >
      <Icon name={look.icon} size={12} />
      {label ?? look.word}
    </span>
  );
}

/** One warning as a banner row. */
export function TargetWarning({ status, className }: { status: TargetStatus; className?: string }) {
  const look = LOOK[status.level];
  return (
    <div
      role={status.level === "over" ? "alert" : undefined}
      className={cn("flex items-start gap-3 rounded-xl border p-3", className)}
      style={{
        borderColor: `color-mix(in oklab, ${look.accent} 40%, transparent)`,
        background: `color-mix(in oklab, ${look.accent} 8%, transparent)`,
      }}
    >
      <span
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"
        style={{ background: `color-mix(in oklab, ${look.accent} 18%, transparent)` }}
      >
        <Icon name={look.icon} size={15} style={{ color: look.accent }} />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: look.accent }}>
          {status.label}
        </div>
        <div className="text-xs text-fg-secondary">{status.detail}</div>
      </div>
    </div>
  );
}

/**
 * Every status that needs attention, worst first. Renders nothing when they're
 * all `ok`, so a section can drop this in unconditionally.
 */
export function TargetWarnings({
  statuses,
  limit,
  className,
}: {
  statuses: TargetStatus[];
  limit?: number;
  className?: string;
}) {
  const items = attentionStatuses(statuses);
  if (!items.length) return null;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className={cn("space-y-2", className)}>
      {shown.map((s) => (
        <TargetWarning key={s.id} status={s} />
      ))}
      {items.length > shown.length && (
        <p className="text-xs text-fg-muted">+{items.length - shown.length} more needing attention</p>
      )}
    </div>
  );
}

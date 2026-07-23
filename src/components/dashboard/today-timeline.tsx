import { Icon } from "@/components/icon";
import { SECTION_META } from "@/lib/nav";
import type { TimelineEvent } from "@/lib/types";

export function TodayTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-5 pl-1">
      {events.map((e, i) => {
        const meta = e.section !== "system" ? SECTION_META[e.section] : undefined;
        const color = meta?.accent ?? "var(--fg-muted)";
        return (
          <li key={i} className="relative flex gap-4">
            <div className="flex w-10 shrink-0 justify-end pt-1 text-xs text-fg-muted tabular-nums">{e.time}</div>
            <div className="relative flex flex-col items-center">
              <span className="grid size-9 place-items-center rounded-xl" style={{ background: "var(--card-hover)" }}>
                <Icon name={meta?.icon ?? "Sparkles"} size={16} style={{ color }} />
              </span>
              {i < events.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-1 pt-1">
              <div className="text-sm font-medium">{e.title}</div>
              {e.subtitle && <div className="text-xs text-fg-muted">{e.subtitle}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

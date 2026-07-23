import { MONTHS, parseDay, startOfWeek } from "@/lib/dates";
import type { DayActivity, SectionKey } from "@/lib/types";

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

/**
 * GitHub-style intensity heatmap. `section` undefined = combined activity across
 * all areas. Squares shade darker green with more activity that day.
 */
export function ActivityHeatmap({
  activity,
  section,
  weeks = 53,
  today,
}: {
  activity: DayActivity[];
  section?: SectionKey;
  weeks?: number;
  today?: string;
}) {
  const countMap = new Map<string, number>();
  for (const a of activity) {
    const c = section ? a.counts[section] : Object.values(a.counts).reduce((x, y) => x + y, 0);
    countMap.set(a.date, c);
  }

  const last = activity[activity.length - 1]?.date;
  const firstMonday = startOfWeek(activity[Math.max(0, activity.length - weeks * 7)]?.date ?? last);

  // build columns (weeks) of 7 days
  const columns: { date: string; count: number; level: number }[][] = [];
  const cursor = parseDay(firstMonday);
  for (let w = 0; w < weeks; w++) {
    const col: { date: string; count: number; level: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10);
      const count = countMap.get(iso) ?? 0;
      col.push({ date: iso, count, level: last && iso > last ? -1 : levelFor(count) });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(col);
  }

  // month labels
  const monthLabels = columns.map((col, i) => {
    const firstDay = parseDay(col[0].date);
    const prev = i > 0 ? parseDay(columns[i - 1][0].date).getUTCMonth() : -1;
    return firstDay.getUTCMonth() !== prev ? MONTHS[firstDay.getUTCMonth()] : "";
  });

  const heat = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="inline-flex flex-col gap-1.5">
        <div className="flex gap-[3px] pl-7 text-[10px] text-fg-muted">
          {monthLabels.map((m, i) => (
            <div key={i} className="w-3 shrink-0">
              {m}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex flex-col justify-between pr-1 text-[10px] leading-none text-fg-muted">
            <span className="h-3" />
            <span>Mon</span>
            <span className="h-3" />
            <span>Wed</span>
            <span className="h-3" />
            <span>Fri</span>
            <span className="h-3" />
          </div>
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <div
                  key={cell.date}
                  title={cell.level < 0 ? "" : `${cell.date}: ${cell.count} ${cell.count === 1 ? "entry" : "entries"}`}
                  className="size-3 rounded-[3px] ring-1 ring-inset ring-white/5 transition-transform hover:scale-125"
                  style={{
                    background: cell.level < 0 ? "transparent" : heat[cell.level],
                    outline: today && cell.date === today ? "1.5px solid var(--accent-cyan)" : undefined,
                    outlineOffset: today && cell.date === today ? "1px" : undefined,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-fg-muted">
          <span>Less</span>
          {heat.map((h, i) => (
            <span key={i} className="size-3 rounded-[3px]" style={{ background: h }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export { levelFor };

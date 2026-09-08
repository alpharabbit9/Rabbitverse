import { Icon } from "@/components/icon";

/*
  Settings → Data → Export. Plain links, no client JavaScript: the route sets
  `Content-Disposition: attachment`, so the browser downloads rather than
  navigates, and it still works with JS off or a flaky connection.

  One button takes everything as JSON (the shape you'd re-import from); the CSV
  links below are for the tables people actually open in a spreadsheet.
*/

const CSV_TABLES: { table: string; label: string }[] = [
  { table: "expenses", label: "Expenses" },
  { table: "workout_logs", label: "Workouts" },
  { table: "body_metrics", label: "Body stats" },
  { table: "journal_entries", label: "Journal" },
  { table: "projects", label: "Projects" },
  { table: "project_logs", label: "Project updates" },
];

export function ExportCard() {
  return (
    <div className="space-y-3">
      {/* Bare <a download>, wearing the button's classes by hand: <ButtonLink/>
          routes through next/link, and a download must not be a client
          navigation. */}
      <a href="/api/export" download className="rv-btn rv-btn-primary w-full">
        <span className="rv-btn-face px-4 py-2.5">
          <Icon name="Download" size={15} />
          Download everything (JSON)
        </span>
      </a>
      <div className="flex flex-wrap gap-1.5">
        {CSV_TABLES.map((t) => (
          <a key={t.table} href={`/api/export?table=${t.table}`} download className="rv-btn [--rv-pad:3px]">
            <span className="rv-btn-face px-2.5 py-1 text-xs font-normal">{t.label} .csv</span>
          </a>
        ))}
      </div>
      <p className="text-xs text-fg-muted">
        Your data, in files you own. The JSON holds every table — expenses, projects and their milestones, workouts,
        body stats, journal entries and your profile settings.
      </p>
    </div>
  );
}

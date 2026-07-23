"use client";

import { activity, projects, TODAY_ISO } from "@/lib/sample-data";
import { Panel } from "@/components/dashboard/panel";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { Ring } from "@/components/ui/ring";

export default function ProjectsPage() {
  const ongoing = projects.filter((p) => p.status === "ongoing");
  const completed = projects.filter((p) => p.status === "completed");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {ongoing.length} in progress · {completed.length} completed · {projects.length} total
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ongoing.map((p) => {
          const pct = Math.min(100, Math.round((p.current / p.targetValue) * 100));
          return (
            <div key={p.id} className="glass flex items-center gap-4 rounded-2xl p-5">
              <Ring value={pct} size={84} stroke={8} from="var(--accent-blue)" to="var(--accent-cyan)" id={p.id}>
                <span className="text-sm font-bold">{pct}%</span>
              </Ring>
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="text-xs text-fg-muted">
                  {p.current.toLocaleString()} / {p.targetValue.toLocaleString()} {p.targetUnit}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Panel title="Project Activity" subtitle="Days you moved a project forward">
        <ActivityHeatmap activity={activity} section="projects" today={TODAY_ISO} />
      </Panel>
    </div>
  );
}

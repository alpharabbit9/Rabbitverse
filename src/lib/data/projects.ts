import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { buildActivity, bump, type SectionCounts } from "@/lib/aggregate";
import { HEATMAP_DAYS, shapeProjects, shapeTasks } from "@/lib/data/shared";
import type { DayActivity, Project, ProjectCommit, ProjectTask } from "@/lib/types";

export async function getProjectsData(today: string): Promise<{
  projects: Project[];
  activity: DayActivity[];
}> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);
  const [{ data: projRows }, { data: logs }, { data: taskRows }] = await Promise.all([
    supabase.from("projects").select("*").order("status").order("created_at"),
    supabase.from("project_logs").select("project_id,log_date").gte("log_date", start),
    supabase.from("project_tasks").select("id,project_id,title,done").order("position"),
  ]);

  const projects = shapeProjects(projRows);

  // Attach each project's checklist + how many distinct days it was worked on.
  const tasksByProject = new Map<string, ProjectTask[]>();
  for (const t of taskRows ?? []) {
    const pid = String(t.project_id);
    const list = tasksByProject.get(pid) ?? [];
    list.push({ id: String(t.id), title: String(t.title), done: Boolean(t.done) });
    tasksByProject.set(pid, list);
  }
  const daysByProject = new Map<string, Set<string>>();
  for (const l of logs ?? []) {
    const pid = String(l.project_id);
    const set = daysByProject.get(pid) ?? new Set<string>();
    set.add(String(l.log_date));
    daysByProject.set(pid, set);
  }
  for (const p of projects) {
    p.tasks = tasksByProject.get(p.id) ?? [];
    p.daysWorked = daysByProject.get(p.id)?.size ?? 0;
  }

  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const l of logs ?? []) bump(byDate, String(l.log_date), "projects");
  return { projects, activity: buildActivity(start, today, byDate) };
}

/** Full detail for one project: checklist, dated update-commits, and its own heatmap. */
export async function getProjectDetail(
  projectId: string,
  today: string,
): Promise<{ project: Project; activity: DayActivity[] } | null> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);
  const [{ data: projRow }, { data: taskRows }, { data: logRows }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    supabase.from("project_tasks").select("id,project_id,title,done").eq("project_id", projectId).order("position"),
    supabase
      .from("project_logs")
      .select("id,log_date,note")
      .eq("project_id", projectId)
      .order("log_date", { ascending: false }),
  ]);

  if (!projRow) return null;

  const [project] = shapeProjects([projRow]);
  project.tasks = shapeTasks(taskRows);
  project.commits = (logRows ?? [])
    .filter((l) => l.note)
    .map((l): ProjectCommit => ({ id: String(l.id), date: String(l.log_date), note: String(l.note) }));

  const days = new Set<string>();
  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const l of logRows ?? []) {
    const date = String(l.log_date);
    days.add(date);
    if (date >= start) bump(byDate, date, "projects");
  }
  project.daysWorked = days.size;

  return { project, activity: buildActivity(start, today, byDate) };
}

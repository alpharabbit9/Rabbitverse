import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProjectsData } from "@/lib/data/projects";
import { sectionTargetStatuses } from "@/lib/targets";
import { DEFAULT_TARGETS } from "@/lib/targets";
import { activity as sampleActivity, projects as sampleProjects } from "@/lib/sample-data";
import { ProjectsView } from "./projects-view";
import { currentDay } from "@/lib/session";

export default async function ProjectsPage() {
  const today = await currentDay();

  // Project warnings need no user target — they come from each project's own
  // estimated finish date, so demo and live compute them identically.
  if (!isSupabaseConfigured) {
    const statuses = sectionTargetStatuses("projects", { today, targets: DEFAULT_TARGETS, projects: sampleProjects });
    return <ProjectsView projects={sampleProjects} activity={sampleActivity} today={today} statuses={statuses} />;
  }

  const { projects, activity } = await getProjectsData(today);
  const statuses = sectionTargetStatuses("projects", { today, targets: DEFAULT_TARGETS, projects });
  return <ProjectsView projects={projects} activity={activity} today={today} statuses={statuses} canLog />;
}

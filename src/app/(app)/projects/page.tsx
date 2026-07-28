import { dhakaToday } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProjectsData } from "@/lib/data/queries";
import { activity as sampleActivity, projects as sampleProjects } from "@/lib/sample-data";
import { ProjectsView } from "./projects-view";

export default async function ProjectsPage() {
  const today = dhakaToday();

  if (!isSupabaseConfigured) {
    return <ProjectsView projects={sampleProjects} activity={sampleActivity} today={today} />;
  }

  const { projects, activity } = await getProjectsData(today);
  return <ProjectsView projects={projects} activity={activity} today={today} canLog />;
}

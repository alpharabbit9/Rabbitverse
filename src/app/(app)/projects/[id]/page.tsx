import { notFound } from "next/navigation";
import { dhakaToday } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProjectDetail } from "@/lib/data/projects";
import { activity as sampleActivity, projects as sampleProjects, sampleProjectDetail } from "@/lib/sample-data";
import { ProjectDetailView } from "./project-detail-view";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const today = dhakaToday();

  if (!isSupabaseConfigured) {
    const base = sampleProjects.find((p) => p.id === id);
    if (!base) notFound();
    const { tasks, commits, daysWorked } = sampleProjectDetail(base);
    return (
      <ProjectDetailView
        project={{ ...base, tasks, commits, daysWorked }}
        activity={sampleActivity}
        today={today}
      />
    );
  }

  const detail = await getProjectDetail(id, today);
  if (!detail) notFound();
  return <ProjectDetailView project={detail.project} activity={detail.activity} today={today} canLog />;
}

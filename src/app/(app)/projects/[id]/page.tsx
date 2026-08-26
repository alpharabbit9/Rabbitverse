import { notFound } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProjectDetail } from "@/lib/data/projects";
import { projectTargetStatus } from "@/lib/targets";
import { activity as sampleActivity, projects as sampleProjects, sampleProjectDetail } from "@/lib/sample-data";
import { ProjectDetailView } from "./project-detail-view";
import { currentDay } from "@/lib/session";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const today = await currentDay();

  if (!isSupabaseConfigured) {
    const base = sampleProjects.find((p) => p.id === id);
    if (!base) notFound();
    const { tasks, commits, daysWorked } = sampleProjectDetail(base);
    const project = { ...base, tasks, commits, daysWorked };
    return (
      <ProjectDetailView
        project={project}
        activity={sampleActivity}
        today={today}
        status={projectTargetStatus(project, today)}
      />
    );
  }

  const detail = await getProjectDetail(id, today);
  if (!detail) notFound();
  return (
    <ProjectDetailView
      project={detail.project}
      activity={detail.activity}
      today={today}
      status={projectTargetStatus(detail.project, today)}
      canLog
    />
  );
}

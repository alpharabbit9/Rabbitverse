"use client";

/*
  CreateProjectPage — the client half of /projects/new.

  It composes and nothing else: the state machine is `useCreateProject`, each
  section is its own component, and this file's whole job is deciding which of
  them is on screen right now.

    idle     → section 1 only
    loading  → section 1 + two skeletons
    ready    → section 1 + blueprint + milestones + Create
    error    → section 1 with the error and a retry, plus whatever survived
*/

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreateSection } from "@/components/projects/create/create-section";
import { CreateProjectButton } from "@/components/projects/create/create-project-button";
import { ProjectDescriptionForm } from "@/components/projects/create/description-form";
import { BlueprintSkeleton, ProjectBlueprint } from "@/components/projects/create/project-blueprint";
import { MilestonesSection, MilestonesSkeleton } from "@/components/projects/create/milestones-section";
import { useCreateProject } from "@/components/projects/create/use-create-project";

export function CreateProjectView({ canSave }: { canSave: boolean }) {
  const router = useRouter();
  const api = useCreateProject((projectId) => router.push(`/projects/${projectId}`));
  const { state, generating, creating, hasBlueprint, validationError, confirming } = api;

  const showSkeletons = generating && !hasBlueprint;

  return (
    <div className="mx-auto w-full max-w-4xl pb-4">
      <header className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
        >
          <Icon name="ChevronLeft" size={14} />
          All projects
        </Link>
        <h1 className="heading-display mt-3 text-2xl font-bold sm:text-[32px] sm:leading-[1.15]">
          Create New Project
        </h1>
        <p className="mt-1.5 text-sm text-fg-secondary">
          Describe your project idea and let AI help you structure it.
        </p>
      </header>

      <div className="space-y-4 sm:space-y-5">
        <CreateSection
          step={1}
          title="Describe Your Project"
          description="Write about your idea, the problems you want to solve, and how you plan to build it."
        >
          <ProjectDescriptionForm api={api} />
        </CreateSection>

        {showSkeletons && (
          <>
            <BlueprintSkeleton />
            <MilestonesSkeleton />
          </>
        )}

        {hasBlueprint && (
          <>
            <ProjectBlueprint api={api} />
            <MilestonesSection api={api} />
            {!canSave && (
              <p className="rounded-xl border border-accent-gold/35 bg-accent-gold/10 px-4 py-3 text-xs text-fg-secondary">
                Demo mode — this draft is fully editable, but connect Supabase to save it as a real project.
              </p>
            )}
            <CreateProjectButton
              onCreate={api.actions.create}
              creating={creating}
              validationError={canSave ? validationError : "Demo mode — connect Supabase to save projects."}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirming === "clear"}
        title="Clear this draft?"
        description={
          <>
            This removes your description, logo, the generated blueprint and all{" "}
            {state.blueprint?.milestones.length ?? 0} milestones. It cannot be undone.
          </>
        }
        confirmLabel="Clear everything"
        tone="danger"
        onConfirm={api.confirmClear}
        onCancel={api.cancelConfirm}
      />
    </div>
  );
}

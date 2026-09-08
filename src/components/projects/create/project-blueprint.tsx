"use client";

/*
  ProjectBlueprint — section 2.

  Three cards: what it is, what it does, what it fixes. Three across on a desktop
  as in the design, two-and-one on a tablet, stacked on a phone. Nothing here
  owns state; every edit goes straight back to the draft in `useCreateProject`.
*/

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateSection } from "./create-section";
import { FeaturesCard } from "./features-card";
import { IdeaCard } from "./idea-card";
import { ProblemsCard } from "./problems-card";
import type { CreateProjectApi } from "./use-create-project";

export function ProjectBlueprint({ api }: { api: CreateProjectApi }) {
  const { state, generating, actions } = api;
  const blueprint = state.blueprint;
  if (!blueprint) return null;

  return (
    <CreateSection
      animate
      step={2}
      title="AI Generated Project Blueprint"
      description="Review and edit the AI-generated breakdown of your project."
      action={
        <Button size="sm" onClick={actions.generate} loading={generating} faceClassName="gap-1.5">
          {!generating && <Icon name="RefreshCw" size={14} />}
          Regenerate
        </Button>
      }
    >
      {state.offline && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-accent-gold/35 bg-accent-gold/10 px-3.5 py-2.5 text-xs text-fg-secondary">
          <Icon name="TriangleAlert" size={14} className="mt-0.5 shrink-0" style={{ color: "var(--accent-gold)" }} />
          Drafted offline from your own words — the AI service is not configured, so read this one closely.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <IdeaCard idea={blueprint.idea} onChange={actions.setIdea} />
        <FeaturesCard
          features={blueprint.keyFeatures}
          onRestore={(snapshot) => restoreList(snapshot, blueprint.keyFeatures, actions.updateFeature, actions.removeFeature, actions.addFeature)}
          onUpdate={actions.updateFeature}
          onRemove={actions.removeFeature}
          onAdd={actions.addFeature}
        />
        <ProblemsCard
          problems={blueprint.problems}
          onRestore={(snapshot) => restoreList(snapshot, blueprint.problems, actions.updateProblem, actions.removeProblem, actions.addProblem)}
          onUpdate={actions.updateProblem}
          onRemove={actions.removeProblem}
          onAdd={actions.addProblem}
        />
      </div>
    </CreateSection>
  );
}

/**
 * Put a snapshot back over the live list using only the three list actions the
 * reducer exposes — no extra "replace the whole list" action, which would exist
 * solely for Cancel and be a foot-gun everywhere else.
 *
 * Order matters: the extra rows are dropped from the end first (so no earlier
 * index shifts under the loop), then the survivors are rewritten in place, then
 * anything the snapshot had and the list has lost is appended back.
 */
function restoreList(
  snapshot: string[],
  current: string[],
  update: (index: number, value: string) => void,
  remove: (index: number) => void,
  add: (value: string) => void,
) {
  for (let i = current.length - 1; i >= snapshot.length; i--) remove(i);
  for (let i = 0; i < Math.min(snapshot.length, current.length); i++) {
    if (snapshot[i] !== current[i]) update(i, snapshot[i]);
  }
  for (let i = current.length; i < snapshot.length; i++) add(snapshot[i]);
}

/** What section 2 looks like while the model is thinking. */
export function BlueprintSkeleton() {
  return (
    <CreateSection
      animate
      step={2}
      title="AI Generated Project Blueprint"
      description="Analyzing your project…"
      action={
        <span className="flex items-center gap-2 text-xs text-fg-muted">
          <Icon name="Loader" size={14} className="animate-spin" style={{ color: "var(--accent-purple)" }} />
          Thinking
        </span>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass rounded-2xl p-4">
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 space-y-2.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[92%]" />
              <Skeleton className="h-3 w-[78%]" />
              <Skeleton className="h-3 w-[85%]" />
            </div>
          </div>
        ))}
      </div>
    </CreateSection>
  );
}

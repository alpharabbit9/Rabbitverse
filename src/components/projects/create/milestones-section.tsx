"use client";

/*
  MilestonesSection — section 3.

  Owns three things the rows cannot own individually: which row is being
  dragged, which row is being dragged over (and on which edge), and the live
  region that announces a move. Everything else is delegated to MilestoneCard.

  "Edit Milestones" is a mode, not a dialog: it opens every row's editor at once,
  which is the fastest way to rewrite an AI-generated list. Individual rows can
  still be edited one at a time from their own ⋯ menu.
*/

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DraftMilestone } from "@/lib/ai/project-blueprint";
import { CreateSection } from "./create-section";
import { MilestoneCard } from "./milestone-card";
import type { CreateProjectApi } from "./use-create-project";

export function MilestonesSection({ api }: { api: CreateProjectApi }) {
  const { state, actions } = api;
  const milestones = state.blueprint?.milestones ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAll, setEditAll] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [over, setOver] = useState<{ index: number; edge: "above" | "below" } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  /** Snapshot for a single-row Cancel. */
  const snapshot = useRef<DraftMilestone | null>(null);

  if (!state.blueprint) return null;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= milestones.length || from === to) return;
    actions.moveMilestone(from, to);
    setAnnouncement(`${milestones[from].title || "Milestone"} moved to position ${to + 1} of ${milestones.length}.`);
  };

  const finishDrag = () => {
    if (dragIndex !== null && over) {
      // Dropping below a row that sits after the dragged one already accounts
      // for the row leaving its old slot, so only the "below" case shifts.
      const target = over.edge === "below" && over.index < dragIndex ? over.index + 1 : over.index;
      move(dragIndex, target);
    }
    setDragIndex(null);
    setOver(null);
  };

  const startEdit = (m: DraftMilestone) => {
    snapshot.current = { ...m };
    setEditingId(m.id);
  };

  const cancelEdit = () => {
    const previous = snapshot.current;
    if (previous) {
      actions.updateMilestone(previous.id, {
        title: previous.title,
        description: previous.description,
        status: previous.status,
      });
    }
    snapshot.current = null;
    setEditingId(null);
  };

  /** A row left blank on close was never really added — drop it. */
  const finishEdit = (m: DraftMilestone) => {
    if (!m.title.trim()) actions.removeMilestone(m.id);
    snapshot.current = null;
    setEditingId(null);
    setEditAll(false);
  };

  const addMilestone = () => {
    // The id comes back from the action, so the new row can open straight into
    // its editor without waiting for a render to look it up.
    const id = actions.addMilestone();
    setEditAll(false);
    snapshot.current = null;
    setEditingId(id);
  };

  return (
    <CreateSection
      animate
      step={3}
      title="Milestones (Auto Generated)"
      description="AI has broken down your project into actionable milestones."
      action={
        <Button
          size="sm"
          onClick={() => {
            setEditAll((v) => !v);
            setEditingId(null);
          }}
          selected={editAll}
          faceClassName="gap-1.5"
        >
          <Icon name={editAll ? "Check" : "Pencil"} size={14} />
          {editAll ? "Done editing" : "Edit Milestones"}
        </Button>
      }
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {milestones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          No milestones yet — add the first one below.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {milestones.map((milestone, index) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              index={index}
              total={milestones.length}
              editing={editAll || editingId === milestone.id}
              dragging={dragIndex === index}
              dropEdge={over?.index === index && dragIndex !== index ? over.edge : null}
              onEdit={() => startEdit(milestone)}
              onEditDone={() => finishEdit(milestone)}
              onEditCancel={() => (editAll ? setEditAll(false) : cancelEdit())}
              onChange={(patch) => actions.updateMilestone(milestone.id, patch)}
              onStatus={(status) => actions.setMilestoneStatus(milestone.id, status)}
              onDelete={() => actions.removeMilestone(milestone.id)}
              onMove={(to) => move(index, to)}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={finishDrag}
              onDragOverRow={(edge) => setOver({ index, edge })}
              onDropRow={finishDrag}
            />
          ))}
        </ul>
      )}

      <Button variant="dashed" block onClick={addMilestone} className="mt-3" faceClassName="gap-2 py-2.5">
        <Icon name="Plus" size={15} />
        Add milestone
      </Button>
    </CreateSection>
  );
}

/** Section 3 while the model is thinking. */
export function MilestonesSkeleton() {
  return (
    <CreateSection
      animate
      step={3}
      title="Milestones (Auto Generated)"
      description="Breaking the work into ordered checkpoints…"
    >
      <ul className="space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="glass flex items-start gap-3 rounded-xl p-4">
            <Skeleton className="size-5 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-2.5 w-full max-w-md" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </li>
        ))}
      </ul>
    </CreateSection>
  );
}

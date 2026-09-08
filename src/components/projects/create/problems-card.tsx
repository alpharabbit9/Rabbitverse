"use client";

/*
  ProblemsCard — the pains the project is aimed at. Same list machinery as the
  features card, a different marker and hue.
*/

import { BlueprintCard } from "./blueprint-card";
import { EditableList } from "./editable-list";

export function ProblemsCard({
  problems,
  onRestore,
  onUpdate,
  onRemove,
  onAdd,
}: {
  problems: string[];
  onRestore: (snapshot: string[]) => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: (value: string) => void;
}) {
  return (
    <BlueprintCard emoji="🎯" title="Problems We Solve" hue="rose" value={problems} onRestore={onRestore}>
      {(editing) => (
        <EditableList
          items={problems}
          editing={editing}
          label="Problems we solve"
          marker="diamond"
          markerColor="var(--accent-purple)"
          addLabel="Add a problem"
          onUpdate={onUpdate}
          onRemove={onRemove}
          onAdd={onAdd}
        />
      )}
    </BlueprintCard>
  );
}

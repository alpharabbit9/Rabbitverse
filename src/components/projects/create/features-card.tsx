"use client";

/*
  FeaturesCard — what the project will actually do, one line each.
*/

import { BlueprintCard } from "./blueprint-card";
import { EditableList } from "./editable-list";

export function FeaturesCard({
  features,
  onRestore,
  onUpdate,
  onRemove,
  onAdd,
}: {
  features: string[];
  onRestore: (snapshot: string[]) => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: (value: string) => void;
}) {
  return (
    <BlueprintCard emoji="✨" title="Key Features" hue="blue" value={features} onRestore={onRestore}>
      {(editing) => (
        <EditableList
          items={features}
          editing={editing}
          label="Key features"
          marker="check"
          markerColor="var(--accent-mint)"
          addLabel="Add a feature"
          onUpdate={onUpdate}
          onRemove={onRemove}
          onAdd={onAdd}
        />
      )}
    </BlueprintCard>
  );
}

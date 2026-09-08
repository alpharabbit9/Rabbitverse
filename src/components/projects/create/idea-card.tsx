"use client";

/*
  IdeaCard — the model's one-paragraph reading of what the user is building.
  Reads as prose; edits as a textarea.
*/

import { BlueprintCard } from "./blueprint-card";

export function IdeaCard({
  idea,
  onChange,
}: {
  idea: string;
  onChange: (value: string) => void;
}) {
  return (
    <BlueprintCard emoji="💡" title="The Idea" hue="purple" value={idea} onRestore={onChange}>
      {(editing) =>
        editing ? (
          <textarea
            value={idea}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            maxLength={1000}
            autoFocus
            aria-label="Project idea"
            className="w-full resize-none rounded-xl border border-border bg-card-hover/60 px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-accent-purple"
          />
        ) : (
          <p className="text-sm leading-relaxed text-fg-secondary">{idea}</p>
        )
      }
    </BlueprintCard>
  );
}

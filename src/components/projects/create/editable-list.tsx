"use client";

/*
  The bullet list behind both Key Features and Problems We Solve.

  Read mode is a plain <ul> with the card's marker glyph. Edit mode turns every
  row into an input with a delete button and adds one "add another" row at the
  bottom — Enter there commits and keeps focus, so a whole list can be typed
  without reaching for the mouse.
*/

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EditableList({
  items,
  editing,
  label,
  marker,
  markerColor,
  addLabel,
  onUpdate,
  onRemove,
  onAdd,
}: {
  items: string[];
  editing: boolean;
  /** Names the list for assistive tech, e.g. "Key features". */
  label: string;
  marker: "check" | "diamond";
  markerColor: string;
  addLabel: string;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft("");
    addRef.current?.focus();
  };

  if (!editing) {
    if (!items.length) {
      return <p className="text-sm text-fg-muted">Nothing here yet — use the pencil to add some.</p>;
    }
    return (
      <ul aria-label={label} className="space-y-2">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-start gap-2 text-[13px] leading-snug text-fg-secondary">
            <Marker kind={marker} color={markerColor} />
            <span className="min-w-0 flex-1">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      <ul aria-label={label} className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <Marker kind={marker} color={markerColor} className="mt-0" />
            <input
              value={item}
              onChange={(e) => onUpdate(i, e.target.value)}
              maxLength={200}
              aria-label={`${label} item ${i + 1}`}
              className="min-w-0 flex-1 rounded-lg border border-border bg-card-hover/60 px-2.5 py-1.5 text-[13px] outline-none transition-colors focus:border-accent-purple"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              hue="rose"
              onClick={() => onRemove(i)}
              aria-label={`Delete: ${item || `${label} item ${i + 1}`}`}
            >
              <Icon name="X" size={14} />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-1.5 pl-[22px]">
        <input
          ref={addRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          maxLength={200}
          placeholder={addLabel}
          aria-label={addLabel}
          className="min-w-0 flex-1 rounded-lg border border-dashed border-border bg-transparent px-2.5 py-1.5 text-[13px] outline-none transition-colors focus:border-accent-purple"
        />
        <Button variant="ghost" size="icon-sm" onClick={commit} disabled={!draft.trim()} aria-label={addLabel}>
          <Icon name="Plus" size={15} />
        </Button>
      </div>
    </div>
  );
}

function Marker({ kind, color, className }: { kind: "check" | "diamond"; color: string; className?: string }) {
  if (kind === "check") {
    return (
      <Icon name="CheckCircle2" size={15} className={cn("mt-0.5 shrink-0", className)} style={{ color }} />
    );
  }
  return (
    <span aria-hidden className={cn("mt-[3px] shrink-0 text-[11px] leading-none", className)} style={{ color }}>
      ◆
    </span>
  );
}

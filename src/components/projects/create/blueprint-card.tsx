"use client";

/*
  The shell the three blueprint cards share: a tinted glass panel with an emoji
  title, a pencil that flips it into edit mode, and Save / Cancel while it is
  there.

  Editing is snapshot-based. The card takes a copy of its slice of the draft when
  the pencil is pressed, edits the live draft as the user types (so nothing has
  to be re-plumbed on save), and puts the snapshot back if they cancel. That is
  what makes Cancel mean "undo everything I just did in this card" rather than
  "stop editing".
*/

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { hueValue, type HueName } from "@/lib/hues";
import { cn } from "@/lib/utils";

export function BlueprintCard<T>({
  emoji,
  title,
  hue,
  value,
  onRestore,
  className,
  children,
}: {
  emoji: string;
  title: string;
  hue: HueName;
  /** The current slice of the draft — snapshotted when editing starts. */
  value: T;
  /** Put a snapshot back. Called only on Cancel. */
  onRestore: (snapshot: T) => void;
  className?: string;
  children: (editing: boolean) => React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<T | null>(null);
  const editing = snapshot !== null;
  const angle = hueValue(hue);

  return (
    <section
      style={
        {
          "--card-hue": angle,
          borderColor: `hsl(${angle} 90% 70% / ${editing ? 0.55 : 0.28})`,
        } as React.CSSProperties
      }
      className={cn(
        "glass relative flex flex-col rounded-2xl p-4 transition-shadow duration-300",
        editing && "shadow-[0_0_0_3px_hsl(var(--card-hue)_90%_70%_/_0.16)]",
        className,
      )}
    >
      {/* A whisper of the card's hue, rising from the bottom-left corner. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-70"
        style={{
          background: `radial-gradient(120% 90% at 0% 110%, hsl(${angle} 90% 65% / 0.14), transparent 62%)`,
        }}
      />

      <header className="relative flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden>{emoji}</span>
          {title}
        </h3>

        {editing ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" hue="mint" onClick={() => setSnapshot(null)} aria-label={`Save ${title}`}>
              <Icon name="Check" size={15} style={{ color: "var(--accent-mint)" }} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              hue="rose"
              onClick={() => {
                onRestore(snapshot as T);
                setSnapshot(null);
              }}
              aria-label={`Cancel editing ${title}`}
            >
              <Icon name="X" size={15} />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon-sm" onClick={() => setSnapshot(structuredClone(value))} aria-label={`Edit ${title}`}>
            <Icon name="Pencil" size={14} />
          </Button>
        )}
      </header>

      <div className="relative mt-3 flex-1">{children(editing)}</div>
    </section>
  );
}

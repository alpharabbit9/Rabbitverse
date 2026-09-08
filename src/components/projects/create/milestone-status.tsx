"use client";

/*
  The milestone status badge, and the little popover that changes it.

  Three states, three registers: Planned is quiet (it is the default and most
  rows are in it), In progress carries a live dot, Completed is mint. All three
  say their state in words as well as colour.
*/

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABEL, type MilestoneStatus } from "@/lib/ai/project-blueprint";
import { cn } from "@/lib/utils";

const TONE: Record<MilestoneStatus, { text: string; bg: string; border: string }> = {
  planned: {
    text: "var(--accent-mint)",
    bg: "color-mix(in srgb, var(--accent-mint) 12%, transparent)",
    border: "color-mix(in srgb, var(--accent-mint) 26%, transparent)",
  },
  in_progress: {
    text: "var(--accent-cyan)",
    bg: "color-mix(in srgb, var(--accent-cyan) 14%, transparent)",
    border: "color-mix(in srgb, var(--accent-cyan) 32%, transparent)",
  },
  completed: {
    text: "var(--accent-purple)",
    bg: "color-mix(in srgb, var(--accent-purple) 16%, transparent)",
    border: "color-mix(in srgb, var(--accent-purple) 34%, transparent)",
  },
};

export function StatusBadge({ status, className }: { status: MilestoneStatus; className?: string }) {
  const tone = TONE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        className,
      )}
      style={{ color: tone.text, backgroundColor: tone.bg, borderColor: tone.border }}
    >
      {status === "in_progress" && (
        <span aria-hidden className="size-1.5 animate-pulse rounded-full" style={{ backgroundColor: tone.text }} />
      )}
      {status === "completed" && <Icon name="Check" size={11} />}
      {MILESTONE_STATUS_LABEL[status]}
    </span>
  );
}

export function StatusPicker({
  status,
  onChange,
  label,
}: {
  status: MilestoneStatus;
  onChange: (status: MilestoneStatus) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} — status: ${MILESTONE_STATUS_LABEL[status]}. Change status`}
        className="[--rv-pad:2px]"
        faceClassName="p-0"
      >
        <StatusBadge status={status} />
      </Button>

      {open && (
        <ul
          role="listbox"
          aria-label={`Status for ${label}`}
          className="absolute right-0 z-20 mt-1.5 w-40 overflow-hidden rounded-xl border border-border bg-card-solid p-1 shadow-lg"
        >
          {MILESTONE_STATUSES.map((option) => (
            <li key={option}>
              <Button
                variant="ghost"
                size="sm"
                block
                role="option"
                aria-selected={option === status}
                aria-pressed={undefined}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="[--rv-pad:2px]"
                faceClassName="justify-between gap-2 px-2.5 py-2 text-left text-xs font-normal"
              >
                {MILESTONE_STATUS_LABEL[option]}
                {option === status && <Icon name="Check" size={13} style={{ color: "var(--accent-mint)" }} />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

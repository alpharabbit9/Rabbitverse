"use client";

/*
  MilestoneEditor — the inline form a milestone row turns into.

  Edits land on the draft as they are typed; Done just closes the form. Cancel
  restores the snapshot the row took when it opened, so an abandoned edit leaves
  nothing behind. A milestone with no title is dropped on close rather than kept
  as a blank row — that is also how "Add milestone" cleans up after itself.
*/

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABEL, type MilestoneStatus } from "@/lib/ai/project-blueprint";

export function MilestoneEditor({
  index,
  title,
  description,
  status,
  onChange,
  onDone,
  onCancel,
}: {
  index: number;
  title: string;
  description: string;
  status: MilestoneStatus;
  onChange: (patch: { title?: string; description?: string; status?: MilestoneStatus }) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => titleRef.current?.focus(), []);

  const titleId = `milestone-${index}-title`;
  const descriptionId = `milestone-${index}-description`;
  const statusId = `milestone-${index}-status`;

  return (
    <div
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <div>
        <label htmlFor={titleId} className="mb-1 block text-[11px] font-medium text-fg-muted">
          Milestone {index + 1} title
        </label>
        <input
          ref={titleRef}
          id={titleId}
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={200}
          placeholder="e.g. Core Dashboard"
          className="w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-sm font-medium outline-none transition-colors focus:border-accent-purple"
        />
      </div>

      <div>
        <label htmlFor={descriptionId} className="mb-1 block text-[11px] font-medium text-fg-muted">
          What this milestone covers
        </label>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          maxLength={500}
          placeholder="One sentence describing the work."
          className="w-full resize-none rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-[13px] outline-none transition-colors focus:border-accent-purple"
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor={statusId} className="mb-1 block text-[11px] font-medium text-fg-muted">
            Status
          </label>
          <select
            id={statusId}
            value={status}
            onChange={(e) => onChange({ status: e.target.value as MilestoneStatus })}
            className="rounded-xl border border-border bg-card-hover px-3 py-2 text-xs outline-none transition-colors focus:border-accent-purple"
          >
            {MILESTONE_STATUSES.map((option) => (
              <option key={option} value={option}>
                {MILESTONE_STATUS_LABEL[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={onDone} faceClassName="gap-1.5">
            <Icon name="Check" size={14} />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

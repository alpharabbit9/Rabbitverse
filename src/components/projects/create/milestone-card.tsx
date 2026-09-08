"use client";

/*
  MilestoneCard — one row in section 3.

  Reordering has two equally real routes, not one route plus a fallback:

    * pointer — the row is `draggable`, the ⋮⋮ handle is the grab affordance,
      and the row being dragged over shows the insertion edge;
    * keyboard — focus the handle and press ↑ / ↓. The move is announced through
      the section's live region, which is the part a pure HTML5 drag can never
      do for a screen reader.

  The ⋯ menu carries the same moves plus Edit and Delete, so nothing is reachable
  by drag alone.
*/

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import type { DraftMilestone, MilestoneStatus } from "@/lib/ai/project-blueprint";
import { cn } from "@/lib/utils";
import { MilestoneEditor } from "./milestone-editor";
import { StatusPicker } from "./milestone-status";

export interface MilestoneCardProps {
  milestone: DraftMilestone;
  index: number;
  total: number;
  editing: boolean;
  dropEdge: "above" | "below" | null;
  dragging: boolean;
  onEdit: () => void;
  onEditDone: () => void;
  onEditCancel: () => void;
  onChange: (patch: Partial<Omit<DraftMilestone, "id">>) => void;
  onStatus: (status: MilestoneStatus) => void;
  onDelete: () => void;
  onMove: (to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverRow: (edge: "above" | "below") => void;
  onDropRow: () => void;
}

export function MilestoneCard({
  milestone,
  index,
  total,
  editing,
  dropEdge,
  dragging,
  onEdit,
  onEditDone,
  onEditCancel,
  onChange,
  onStatus,
  onDelete,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOverRow,
  onDropRow,
}: MilestoneCardProps) {
  const label = milestone.title || `Milestone ${index + 1}`;

  return (
    <li
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        // Firefox refuses to start a drag without payload on the transfer.
        e.dataTransfer.setData("text/plain", milestone.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (editing) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const box = e.currentTarget.getBoundingClientRect();
        onDragOverRow(e.clientY < box.top + box.height / 2 ? "above" : "below");
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropRow();
      }}
      // Earlier rows paint above later ones. `.glass` sets a backdrop-filter,
      // which makes every row its own stacking context — so the `z-20` on the
      // status and ⋯ popovers only ranks them *within* their own row, and the
      // next row down covers them (verified: elementFromPoint over an open
      // dropdown returned the following <li>). Ordering the rows themselves is
      // what actually lets a downward-opening menu be clicked.
      style={{ zIndex: total - index }}
      className={cn(
        "glass relative rounded-xl p-3.5 transition-all duration-200 sm:p-4",
        "hover:border-border-strong",
        dragging && "opacity-45",
        editing && "border-accent-purple/50 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-purple)_14%,transparent)]",
      )}
    >
      {dropEdge && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-3 h-0.5 rounded-full bg-accent-purple shadow-[0_0_10px_var(--accent-purple)]",
            dropEdge === "above" ? "-top-1" : "-bottom-1",
          )}
        />
      )}

      {editing ? (
        <MilestoneEditor
          index={index}
          title={milestone.title}
          description={milestone.description}
          status={milestone.status}
          onChange={onChange}
          onDone={onEditDone}
          onCancel={onEditCancel}
        />
      ) : (
        <div className="flex items-start gap-3">
          <DragHandle label={label} index={index} total={total} onMove={onMove} />

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-accent-purple">Milestone {index + 1}</p>
            <h3 className="mt-0.5 break-words text-sm font-semibold">
              {milestone.title || <span className="text-fg-muted">Untitled milestone</span>}
            </h3>
            {milestone.description && (
              <p className="mt-1 break-words text-xs leading-relaxed text-fg-muted">{milestone.description}</p>
            )}

            {/* The badge sits under the text on a phone and to the right on a
                desktop — same element, so its popover behaves identically. */}
            <div className="mt-2.5 sm:hidden">
              <StatusPicker status={milestone.status} onChange={onStatus} label={label} />
            </div>
          </div>

          <div className="hidden shrink-0 sm:block">
            <StatusPicker status={milestone.status} onChange={onStatus} label={label} />
          </div>

          <MilestoneMenu
            label={label}
            index={index}
            total={total}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
          />
        </div>
      )}
    </li>
  );
}

function DragHandle({
  label,
  index,
  total,
  onMove,
}: {
  label: string;
  index: number;
  total: number;
  onMove: (to: number) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Reorder ${label}. Position ${index + 1} of ${total}. Use the arrow keys to move it.`}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onMove(index - 1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onMove(index + 1);
        }
      }}
      className="mt-0.5 cursor-grab active:cursor-grabbing"
    >
      <Icon name="GripVertical" size={15} />
    </Button>
  );
}

function MilestoneMenu({
  label,
  index,
  total,
  onEdit,
  onDelete,
  onMove,
}: {
  label: string;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (to: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setConfirming(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // One menu row's face — the glass and the halo come from <Button variant="ghost"/>.
  const item = "justify-start gap-2 px-2.5 py-2 text-left text-xs font-normal";

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="MoreHorizontal" size={16} />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[9.5rem] overflow-hidden rounded-xl border border-border bg-card-solid p-1 shadow-lg"
        >
          <Button
            variant="ghost"
            size="sm"
            block
            role="menuitem"
            className="[--rv-pad:2px]"
            faceClassName={item}
            onClick={() => {
              close();
              onEdit();
            }}
          >
            <Icon name="Pencil" size={13} />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            block
            role="menuitem"
            disabled={index === 0}
            className="[--rv-pad:2px]"
            faceClassName={item}
            onClick={() => {
              close();
              onMove(index - 1);
            }}
          >
            <Icon name="ArrowUp" size={13} />
            Move up
          </Button>
          <Button
            variant="ghost"
            size="sm"
            block
            role="menuitem"
            disabled={index === total - 1}
            className="[--rv-pad:2px]"
            faceClassName={item}
            onClick={() => {
              close();
              onMove(index + 1);
            }}
          >
            <Icon name="ArrowDown" size={13} />
            Move down
          </Button>
          <Button
            variant={confirming ? "primary" : "ghost"}
            hue="rose"
            size="sm"
            block
            role="menuitem"
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              close();
              onDelete();
            }}
            className="[--rv-pad:2px]"
            faceClassName={cn(item, !confirming && "text-accent-rose")}
          >
            <Icon name="Trash2" size={13} />
            {confirming ? "Confirm delete" : "Delete"}
          </Button>
        </div>
      )}
    </div>
  );
}

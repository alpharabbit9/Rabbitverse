"use client";

/*
  A compact, tap-friendly row menu (Phase F): ⋯ opens Edit / Delete.

  Delete asks for a second tap — an inline "Confirm delete" on a rose button,
  not a modal — matching the app's calm register. Deliberately no hover-only
  affordances: this runs on a phone, where hover doesn't exist.
*/

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

export function RowMenu({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  align = "right",
  label = "Row actions",
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  align?: "left" | "right";
  label?: string;
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
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-7 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-card-hover hover:text-fg"
      >
        <Icon name="MoreHorizontal" size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-20 mt-1 min-w-[8.5rem] overflow-hidden rounded-xl border border-border bg-card-solid p-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onEdit();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-fg-secondary transition-colors hover:bg-card-hover hover:text-fg"
            >
              <Icon name="Pencil" size={14} />
              {editLabel}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                close();
                onDelete();
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                confirming ? "bg-accent-rose/15 text-accent-rose" : "text-fg-secondary hover:bg-card-hover hover:text-accent-rose"
              }`}
            >
              <Icon name="Trash2" size={14} />
              {confirming ? "Confirm delete" : deleteLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

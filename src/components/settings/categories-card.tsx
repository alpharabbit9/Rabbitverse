"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { RowMenu } from "@/components/ui/row-menu";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_NAME_MAX,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
} from "@/lib/categories";
import type { ExpenseCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createCategory, deleteCategory, updateCategory } from "@/app/(app)/settings/actions";

/*
  Settings → Categories. The six seeded buckets plus anything the user adds.

  Editing happens in place: tapping Edit swaps the row for the same name/colour/
  icon form the "Add" row uses, so there is one editor, not two. Presets can be
  renamed and restyled but not deleted (the ⋯ hides Delete on them) — the AI
  parser and the seeded buckets need a floor to land on.

  Deleting keeps the spending: `expenses.category_id` is `on delete set null`,
  so the amounts stay in every total and only lose their label. The copy says so
  before the second tap.
*/

const inputCls =
  "w-full min-w-0 rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-sm text-fg " +
  "outline-none transition-colors hover:border-border-strong focus:border-border-strong";

interface Draft {
  name: string;
  color: string;
  icon: string;
}

const BLANK: Draft = { name: "", color: DEFAULT_CATEGORY_COLOR, icon: DEFAULT_CATEGORY_ICON };

function CategoryEditor({
  draft,
  setDraft,
  onSubmit,
  onCancel,
  pending,
  submitLabel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3 rounded-xl border border-border bg-card-hover/30 p-3"
    >
      <input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        maxLength={CATEGORY_NAME_MAX}
        placeholder="Category name"
        aria-label="Category name"
        className={inputCls}
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Colour">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setDraft({ ...draft, color: c.value })}
            aria-label={c.label}
            aria-pressed={draft.color === c.value}
            className={cn(
              "size-7 rounded-full border-2 transition-transform",
              draft.color === c.value ? "scale-110 border-fg" : "border-transparent hover:scale-105",
            )}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Icon">
        {CATEGORY_ICONS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setDraft({ ...draft, icon: name })}
            aria-label={name}
            aria-pressed={draft.icon === name}
            className={cn(
              "grid size-8 place-items-center rounded-lg border transition-colors",
              draft.icon === name ? "border-border-strong bg-card-hover" : "border-border hover:bg-card-hover/60",
            )}
          >
            <Icon name={name} size={15} style={{ color: draft.color }} />
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !draft.name.trim()}
          className="rounded-xl border border-border bg-card-solid px-4 py-2 text-sm font-medium transition-colors hover:border-border-strong hover:bg-card-hover disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl px-4 py-2 text-sm text-fg-secondary transition-colors hover:text-fg"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function CategoriesCard({ categories }: { categories: ExpenseCategory[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [pending, startTransition] = useTransition();

  const startAdd = () => {
    setEditingId(null);
    setDraft(BLANK);
    setAdding(true);
  };

  const startEdit = (c: ExpenseCategory) => {
    setAdding(false);
    setDraft({ name: c.name, color: c.color, icon: c.icon });
    setEditingId(c.id);
  };

  const close = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(BLANK);
  };

  const submitAdd = () => {
    startTransition(async () => {
      const res = await createCategory(draft);
      if (res.ok) {
        toast.success(`${draft.name.trim()} added ✓`);
        close();
      } else {
        toast.error(res.error ?? "Could not add that.");
      }
    });
  };

  const submitEdit = (id: string) => {
    startTransition(async () => {
      const res = await updateCategory({ id, ...draft });
      if (res.ok) {
        toast.success("Category updated ✓");
        close();
      } else {
        toast.error(res.error ?? "Could not save that.");
      }
    });
  };

  const remove = (c: ExpenseCategory) => {
    startTransition(async () => {
      const res = await deleteCategory(c.id);
      if (res.ok) toast.success(`${c.name} removed — its expenses kept their amounts`);
      else toast.error(res.error ?? "Could not delete that.");
    });
  };

  return (
    <div className={cn("space-y-3", pending && "opacity-70")}>
      <ul className="space-y-1.5">
        {categories.map((c) =>
          editingId === c.id ? (
            <li key={c.id}>
              <CategoryEditor
                draft={draft}
                setDraft={setDraft}
                onSubmit={() => submitEdit(c.id)}
                onCancel={close}
                pending={pending}
                submitLabel="Save"
              />
            </li>
          ) : (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2.5 text-sm">
                <Icon name={c.icon} size={16} style={{ color: c.color }} />
                <span className="truncate font-medium">{c.name}</span>
                {c.isPreset && <span className="shrink-0 text-[11px] text-fg-muted">starter</span>}
              </span>
              <RowMenu
                onEdit={() => startEdit(c)}
                onDelete={c.isPreset ? undefined : () => remove(c)}
                label={`Actions for ${c.name}`}
              />
            </li>
          ),
        )}
      </ul>

      {adding ? (
        <CategoryEditor
          draft={draft}
          setDraft={setDraft}
          onSubmit={submitAdd}
          onCancel={close}
          pending={pending}
          submitLabel="Add category"
        />
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
        >
          <Icon name="Plus" size={15} />
          New category
        </button>
      )}

      <p className="text-xs text-fg-muted">
        Rename or restyle any of them. Your own categories can be deleted too — the expenses filed under one keep
        their amounts, they just lose the label. The AI box picks new categories up automatically.
      </p>
    </div>
  );
}

"use client";

/*
  ProjectLogoUploader — a drop target that happens to contain a file input.

  The real <input type="file"> is present and focusable (it is what makes this
  work with a keyboard and with a screen reader), but it is visually hidden
  behind a proper label, so the control looks like the rest of the app instead of
  like a browser default. Drag-and-drop is layered on top of the same handler the
  input uses, so both routes end at one `onSelect`.
*/

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { LOGO_ACCEPT, LOGO_FORMATS_LABEL } from "@/lib/project-logo";
import { cn } from "@/lib/utils";

export function ProjectLogoUploader({
  preview,
  fileName,
  uploading,
  onSelect,
  onRemove,
}: {
  preview: string | null;
  fileName: string | null;
  uploading: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onSelect(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-dashed p-4 transition-colors sm:flex-row sm:items-center",
        dragging ? "border-accent-purple bg-accent-purple/5" : "border-border hover:border-border-strong",
      )}
    >
      {/* Preview / drop well */}
      <label
        htmlFor="project-logo"
        className={cn(
          "group relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-border bg-card-hover/60 transition-colors",
          "hover:border-accent-purple/60 focus-within:border-accent-purple",
        )}
      >
        {preview ? (
          // A blob: URL from the user's own picker — next/image would need a
          // remote pattern it can never have, so a plain <img> is correct here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <Icon name="ImagePlus" size={22} className="text-fg-muted transition-colors group-hover:text-fg-secondary" />
        )}

        {uploading && (
          <span className="absolute inset-0 grid place-items-center bg-bg/70 backdrop-blur-sm">
            <Icon name="Loader" size={18} className="animate-spin text-accent-purple" />
          </span>
        )}
      </label>

      <input
        ref={inputRef}
        id="project-logo"
        type="file"
        accept={LOGO_ACCEPT}
        // Its <label> is the preview well, which is an image and has no text —
        // so the accessible name has to be stated here, or the control reaches a
        // screen reader as an unnamed "file upload button".
        aria-label={`Project logo. ${LOGO_FORMATS_LABEL}`}
        aria-describedby="project-logo-hint"
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          // Reset, or picking the same file twice in a row fires nothing.
          e.target.value = "";
        }}
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Project logo</p>
        <p id="project-logo-hint" className="mt-0.5 truncate text-xs text-fg-muted">
          {uploading ? "Uploading…" : fileName ? fileName : `Drag an image here · ${LOGO_FORMATS_LABEL}`}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          onClick={() => inputRef.current?.click()}
          faceClassName="gap-1.5"
          aria-label={preview ? "Change project logo" : "Upload project logo"}
        >
          <Icon name="Upload" size={14} />
          {preview ? "Change" : "Upload"}
        </Button>
        {preview && (
          <Button
            size="sm"
            variant="ghost"
            hue="rose"
            onClick={onRemove}
            faceClassName="gap-1.5"
            aria-label="Remove project logo"
          >
            <Icon name="Trash2" size={14} />
            <span className="sr-only sm:not-sr-only">Remove</span>
          </Button>
        )}
      </div>
    </div>
  );
}

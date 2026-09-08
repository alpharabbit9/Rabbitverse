"use client";

/*
  ProjectDescriptionForm — the body of section 1.

  One textarea, deliberately. The user is not asked to separate idea from
  features from problems; they write the project the way they would describe it
  out loud, and the model does the separating. The placeholder is the example
  from the design, and it stays a placeholder: nothing here is ever pre-filled
  with it, so an untouched form submits nothing.
*/

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { GenerateButton } from "@/components/ui/generate-button";
import { DESCRIPTION_MAX } from "@/lib/ai/project-blueprint";
import { MAX_PROJECT_TAGS, PROJECT_PRESET_TAGS } from "@/lib/project-tags";
import { ProjectLogoUploader } from "./logo-uploader";
import type { CreateProjectApi } from "./use-create-project";

const PLACEHOLDER = `Example:

I want to build a habit tracking and personal growth platform that helps users manage different areas of their lives in one place.

The idea is to replace multiple disconnected apps (goals, habits, fitness, finances, etc.) with a single unified system.

It will have smart insights, AI motivation, and analytics to help users stay consistent.`;

/** Grow to fit the text, but never shrink below the design's tall default. */
const MIN_HEIGHT = 220;

export function ProjectDescriptionForm({ api }: { api: CreateProjectApi }) {
  const { state, generating, hasDraft, actions } = api;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(MIN_HEIGHT, el.scrollHeight)}px`;
  }, [state.description]);

  const count = state.description.length;
  const nearLimit = count > DESCRIPTION_MAX * 0.9;

  return (
    <div className="space-y-4">
      <ProjectLogoUploader
        preview={state.logo.preview}
        fileName={state.logo.fileName}
        uploading={state.logo.uploading}
        onSelect={actions.chooseLogo}
        onRemove={actions.clearLogo}
      />

      <div>
        <label htmlFor="project-name" className="mb-1.5 block text-xs font-medium text-fg-secondary">
          Project name
        </label>
        <input
          id="project-name"
          value={state.name}
          onChange={(e) => actions.setName(e.target.value)}
          maxLength={120}
          placeholder="e.g. Rabbit Verse"
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-card-hover/60 px-3.5 py-2.5 text-sm outline-none transition-colors hover:border-border-strong focus:border-accent-purple focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-purple)_18%,transparent)]"
        />
        <p className="mt-1.5 text-[11px] text-fg-muted">
          Leave it blank and the AI will suggest one from your description.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="project-category" className="mb-1.5 block text-xs font-medium text-fg-secondary">
            Category <span className="text-fg-muted">(optional)</span>
          </label>
          <input
            id="project-category"
            value={state.category}
            onChange={(e) => actions.setCategory(e.target.value)}
            maxLength={60}
            placeholder="e.g. Personal Growth"
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-card-hover/60 px-3.5 py-2.5 text-sm outline-none transition-colors hover:border-border-strong focus:border-accent-purple focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-purple)_18%,transparent)]"
          />
        </div>
        <div>
          <label htmlFor="project-type" className="mb-1.5 block text-xs font-medium text-fg-secondary">
            Type <span className="text-fg-muted">(optional)</span>
          </label>
          <input
            id="project-type"
            value={state.type}
            onChange={(e) => actions.setType(e.target.value)}
            maxLength={60}
            placeholder="e.g. Full-stack Web App"
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-card-hover/60 px-3.5 py-2.5 text-sm outline-none transition-colors hover:border-border-strong focus:border-accent-purple focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-purple)_18%,transparent)]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="project-target-date" className="mb-1.5 block text-xs font-medium text-fg-secondary">
          Aimed finish date <span className="text-fg-muted">(optional)</span>
        </label>
        <input
          id="project-target-date"
          type="date"
          value={state.targetDate}
          onChange={(e) => actions.setTargetDate(e.target.value)}
          className="w-full rounded-xl border border-border bg-card-hover/60 px-3.5 py-2.5 text-sm outline-none transition-colors hover:border-border-strong focus:border-accent-purple focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-purple)_18%,transparent)] sm:max-w-[240px]"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label className="block text-xs font-medium text-fg-secondary">
            Tags <span className="text-fg-muted">(optional)</span>
          </label>
          {state.tags.length > 0 && (
            <span className="text-[11px] tabular-nums text-fg-muted">
              {state.tags.length} / {MAX_PROJECT_TAGS}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_PRESET_TAGS.map((tag) => {
            const selected = state.tags.includes(tag);
            return (
              <Button
                key={tag}
                size="sm"
                hue="cyan"
                selected={selected}
                onClick={() => actions.toggleTag(tag)}
                disabled={!selected && state.tags.length >= MAX_PROJECT_TAGS}
                faceClassName="px-2.5 py-1 text-xs font-medium"
              >
                {tag}
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="project-description" className="mb-1.5 block text-xs font-medium text-fg-secondary">
          Describe your project
        </label>
        <div className="relative rounded-2xl border border-accent-purple/45 bg-card-hover/40 transition-shadow focus-within:border-accent-purple focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-purple)_16%,transparent)]">
          <textarea
            ref={textareaRef}
            id="project-description"
            value={state.description}
            onChange={(e) => actions.setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            placeholder={PLACEHOLDER}
            aria-describedby="project-description-count"
            style={{ minHeight: MIN_HEIGHT }}
            className="w-full resize-none rounded-2xl bg-transparent px-4 py-4 pb-9 text-sm leading-relaxed text-fg-secondary outline-none placeholder:text-fg-muted"
          />
          <span
            id="project-description-count"
            aria-live="polite"
            className={`pointer-events-none absolute bottom-3 right-4 text-xs tabular-nums ${
              nearLimit ? "text-accent-orange" : "text-fg-muted"
            }`}
          >
            {count} / {DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <GenerateButton
          label="Generate with AI"
          activeLabel="Analyzing your project…"
          generating={generating}
          onClick={actions.generate}
          disabled={!state.description.trim()}
          className="flex-1"
          faceClassName="py-2.5 bg-gradient-to-r from-accent-purple to-accent-blue text-white"
        />
        <Button
          variant="ghost"
          onClick={actions.requestClear}
          disabled={!hasDraft || generating}
          faceClassName="gap-2 px-6 py-2.5"
          className="sm:w-44"
          hue="rose"
        >
          <Icon name="Trash2" size={15} />
          Clear
        </Button>
      </div>

      {state.phase === "error" && state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-accent-rose/40 bg-accent-rose/10 px-3.5 py-3 text-sm"
        >
          <Icon name="TriangleAlert" size={16} className="mt-0.5 shrink-0" style={{ color: "var(--accent-rose)" }} />
          <div className="min-w-0 flex-1">
            <p className="text-fg">{state.error}</p>
            <Button variant="ghost" size="sm" hue="rose" onClick={actions.generate} className="mt-1 -ml-1" faceClassName="text-accent-rose">
              Try again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

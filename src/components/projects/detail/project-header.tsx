/*
  The header's left column: logo, title + status pill, description, and the
  metadata strip. The overall-progress card is a sibling, not a child — the
  page lays the two side by side on desktop and stacks them on mobile.

  The logo well is the card kit's `ProjectLogo`, which paints its monogram from
  `--pc-accent`; we set that here to the project's status colour so a project
  with no logo still reads as "its" colour.
*/

import { ProjectLogo } from "../card/project-logo";
import { ProjectStatus } from "../card/project-status";
import { PROJECT_STATUS } from "../card/status";
import { ProjectMetaItem } from "./meta-item";
import type { ProjectDetailData } from "./types";

export function ProjectDetailHeader({
  name,
  status,
  description,
  logo,
  meta,
}: Pick<ProjectDetailData, "name" | "status" | "description" | "logo" | "meta">) {
  const accent = PROJECT_STATUS[status]?.color ?? "var(--accent-purple)";

  return (
    <div className="glass flex h-full min-w-0 flex-col rounded-2xl p-4 sm:p-5 lg:p-6">
      <div className="flex min-w-0 items-start gap-4 sm:gap-5">
        <div style={{ ["--pc-accent" as string]: accent }} className="shrink-0">
          <ProjectLogo src={logo} name={name} fit="cover" className="size-16 sm:size-20 lg:size-[104px]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="heading-display min-w-0 text-2xl font-semibold text-fg sm:text-3xl lg:text-4xl">
              {name}
            </h1>
            <ProjectStatus status={status} />
          </div>

          {description.trim() && (
            <p className="mt-2 max-w-prose text-sm leading-6 text-fg-secondary lg:mt-3">{description}</p>
          )}
        </div>
      </div>

      {meta.length > 0 && (
        <>
          {/* Absorbs the slack when the card is stretched to match the progress
              card beside it, so the meta strip settles at the bottom edge rather
              than leaving a gap beneath it. Zero-height at natural size. */}
          <div aria-hidden className="grow" />
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5 sm:grid-cols-3 xl:grid-cols-5">
            {meta.map((m) => (
              <ProjectMetaItem key={m.label} {...m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

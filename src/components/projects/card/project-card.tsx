"use client";

/*
  ProjectCard — the wide project tile.

  Composition only: every piece it lays out is its own file, and the two facts
  that all of them need are settled here and passed down.

    1. `--pc-accent`, the card's one colour, set on the root and inherited. It
       comes from the status, except that a project at 100% glows mint whatever
       its status column says — a finished thing should look finished.
    2. `progress`, clamped and rounded once, so nothing downstream has to guess
       whether it is holding 43.7 or 44.

  The chrome (surface, border, glow, hover, focus ring, logo well, pill) lives in
  `globals.css` under `.rv-pcard`, next to `.rv-btn`, for the reason given there.
  This component does not work without that stylesheet.

  Structure, top to bottom: logo + [header, progress] + chevron, then the tags,
  then the description and the team. On a phone that same order stacks, which is
  why nothing here is positioned absolutely except the stretched link.
*/

import { ProjectDescription } from "./project-description";
import { ProjectHeader } from "./project-header";
import { ProjectLogo } from "./project-logo";
import { ProjectNavigation } from "./project-navigation";
import { ProjectProgress } from "./project-progress";
import { ProjectTags } from "./project-tags";
import { PROJECT_STATUS } from "./status";
import { TeamAvatars } from "./team-avatars";
import type { ProjectCardData } from "./types";
import { clamp, cn } from "@/lib/utils";

export interface ProjectCardProps {
  project: ProjectCardData;
  /** Where the card goes. Defaults to `/projects/<id>`. */
  href?: string;
  /** Fires on activation, before the navigation — analytics, a drawer, a log. */
  onOpen?: (project: ProjectCardData) => void;
  className?: string;
}

/** Hairline that fades out at both ends — a full-strength rule is too loud here. */
function CardDivider() {
  return (
    <hr className="h-px w-full border-0 bg-[linear-gradient(90deg,transparent,var(--border-strong),transparent)]" />
  );
}

export function ProjectCard({ project, href, onOpen, className }: ProjectCardProps) {
  const status = PROJECT_STATUS[project.status] ? project.status : "planned";
  const progress = Math.round(clamp(project.progress ?? 0, 0, 100));
  const accent = progress >= 100 ? "var(--accent-mint)" : PROJECT_STATUS[status].color;
  const hasTeam = Boolean(project.teamMembers?.length);

  return (
    <article
      className={cn("rv-pcard group @container/pcard w-full", className)}
      style={{ "--pc-accent": accent } as React.CSSProperties}
    >
      <div className="flex flex-col gap-5 p-5 @lg/pcard:gap-6 @lg/pcard:p-7 @5xl/pcard:gap-8 @5xl/pcard:p-10">
        <div className="flex flex-col gap-5 @lg/pcard:flex-row @lg/pcard:items-center @lg/pcard:gap-6 @5xl/pcard:gap-10">
          <ProjectLogo
            src={project.logo}
            name={project.name}
            className="size-24 @lg/pcard:size-36 @3xl/pcard:size-48 @5xl/pcard:size-[17.5rem]"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-5 @lg/pcard:gap-6 @5xl/pcard:gap-9">
            <ProjectHeader
              name={project.name}
              subtitle={project.subtitle}
              status={status}
              href={href ?? `/projects/${project.id}`}
              onOpen={onOpen && (() => onOpen(project))}
            />
            <ProjectProgress
              progress={progress}
              daysLogged={project.daysLogged}
              accent={accent}
              id={project.id}
            />
          </div>

          <ProjectNavigation />
        </div>

        {project.tags?.length ? (
          <>
            <CardDivider />
            <ProjectTags tags={project.tags} />
          </>
        ) : null}

        <CardDivider />

        <div className="flex flex-col gap-4 @lg/pcard:flex-row @lg/pcard:items-center @lg/pcard:justify-between @lg/pcard:gap-6">
          <ProjectDescription text={project.description} />
          {hasTeam && (
            <TeamAvatars members={project.teamMembers} className="@lg/pcard:border-l @lg/pcard:border-border @lg/pcard:pl-5 @5xl/pcard:pl-7" />
          )}
        </div>
      </div>
    </article>
  );
}

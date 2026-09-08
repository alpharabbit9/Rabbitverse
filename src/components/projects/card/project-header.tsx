"use client";

/*
  Name, subtitle, status — and the link that makes the whole card clickable.

  The link is on the *name* and stretched over the card by a pseudo-element
  (`.rv-pcard-link` in globals.css). That is the one arrangement where the card
  is fully clickable AND a screen reader hears "Rabbitverse, link" instead of a
  link with no name, AND the text inside the card stays selectable.

  Space is not how a link is activated — the browser scrolls the page — but the
  card looks like a button-sized surface, so it is honoured here as well.
*/

import Link from "next/link";
import { ProjectStatus } from "./project-status";
import type { ProjectCardStatus } from "./types";
import { cn } from "@/lib/utils";

export function ProjectHeader({
  name,
  subtitle,
  status,
  href,
  onOpen,
  className,
}: {
  name: string;
  subtitle?: string;
  status: ProjectCardStatus;
  href: string;
  onOpen?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 @lg/pcard:gap-5", className)}>
      <div className="min-w-0">
        <h3 className="heading-display truncate text-2xl font-bold @lg/pcard:text-3xl @5xl/pcard:text-[2.75rem] @5xl/pcard:leading-tight">
          <Link
            href={href}
            onClick={onOpen}
            onKeyDown={(event) => {
              if (event.key !== " ") return;
              event.preventDefault();
              event.currentTarget.click();
            }}
            className="rv-pcard-link"
          >
            {name}
          </Link>
        </h3>

        {subtitle?.trim() && (
          <p className="mt-1 truncate text-sm text-fg-muted @lg/pcard:text-base @5xl/pcard:mt-2.5 @5xl/pcard:text-xl">{subtitle}</p>
        )}
      </div>

      <ProjectStatus status={status} />
    </div>
  );
}

/*
  The one-line pitch under the divider. Two lines at most — the card is a
  summary, and a project whose description needs a third line has a detail page.
*/

import { cn } from "@/lib/utils";

export function ProjectDescription({ text, className }: { text?: string; className?: string }) {
  const body = text?.trim();

  return (
    <p
      className={cn(
        "line-clamp-2 text-sm text-fg-secondary @lg/pcard:text-base @5xl/pcard:text-lg",
        !body && "italic text-fg-muted",
        className,
      )}
    >
      {body || "No project description yet."}
    </p>
  );
}

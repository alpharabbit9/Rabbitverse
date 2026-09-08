/*
  The category pills. A list, because that is what it is — six unrelated labels
  in a row are three announcements and a count, not one run-on sentence.

  Icons come from the shared registry by name, which already falls back to a
  sparkle for anything it does not know, so a tag written by the AI planner can
  name an icon this app has never heard of without breaking the row.
*/

import { Icon } from "@/components/icon";
import type { ProjectCardTag } from "./types";
import { cn } from "@/lib/utils";

export function ProjectTags({ tags, className }: { tags?: ProjectCardTag[]; className?: string }) {
  if (!tags?.length) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2 @5xl/pcard:gap-2.5", className)}>
      {tags.map((tag) => (
        <li key={tag.name}>
          <span className="rv-pcard-pill inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-fg-secondary @lg/pcard:text-sm @5xl/pcard:px-4 @5xl/pcard:py-2.5 @5xl/pcard:text-base">
            <Icon name={tag.icon} size={15} className="shrink-0 @5xl/pcard:size-[18px]" style={{ color: "var(--pc-accent)" }} />
            {tag.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

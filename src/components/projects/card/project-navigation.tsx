/*
  The chevron. Decorative — the card is already a link and says so — but it is
  what makes the card read as "openable" at a glance, so it brightens and steps
  right when the pointer is anywhere on the card.

  Hidden on phones, where the stacked layout has no right-hand gutter to put it
  in and a full-width tappable card needs no arrow to explain itself.
*/

import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export function ProjectNavigation({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "hidden shrink-0 self-center text-fg-muted transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-fg-secondary @lg/pcard:block",
        className,
      )}
    >
      <Icon name="ChevronRight" size={32} strokeWidth={1.5} className="size-7 @5xl/pcard:size-10" />
    </span>
  );
}

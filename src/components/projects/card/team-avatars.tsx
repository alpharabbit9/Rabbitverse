/*
  The overlapping avatar stack.

  Nothing here is focusable, on purpose: the whole card is one link, and putting
  tab stops inside a link is how you end up with a keyboard trap that announces
  nothing useful. The name is therefore carried by the image's alt text (or an
  sr-only span behind the initials) and the tooltip is pure decoration for a
  pointer — `aria-hidden`, so it is never read twice.

  The stack lifts itself above the card's stretched link with `z-[1]`; without
  that the link's pseudo-element would swallow the hover.
*/

import { tint } from "./status";
import type { ProjectTeamMember } from "./types";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

const AVATAR = "size-9 rounded-full border-2 border-[var(--surface)] object-cover @lg/pcard:size-10 @5xl/pcard:size-12";

export function TeamAvatars({
  members,
  max = 3,
  className,
}: {
  members?: ProjectTeamMember[];
  /** How many faces before the rest collapse into "+N". */
  max?: number;
  className?: string;
}) {
  if (!members?.length) return null;

  const shown = members.slice(0, max);
  const rest = members.length - shown.length;

  return (
    <div className={cn("relative z-[1] flex shrink-0 items-center", className)}>
      <ul className="flex -space-x-2.5 @5xl/pcard:-space-x-3">
        {shown.map((member) => (
          <li key={member.id} className="group/avatar relative">
            {member.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.avatar} alt={member.name} className={AVATAR} />
            ) : (
              <span
                className={cn(AVATAR, "grid place-items-center text-[11px] font-semibold @lg/pcard:text-xs")}
                style={{
                  backgroundColor: tint("var(--pc-accent)", 22, "var(--surface)"),
                  color: tint("var(--pc-accent)", 55, "var(--fg)"),
                }}
              >
                <span aria-hidden>{initials(member.name)}</span>
                <span className="sr-only">{member.name}</span>
              </span>
            )}

            <span
              aria-hidden
              className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-[var(--card-solid)] px-2.5 py-1 text-xs font-medium text-fg opacity-0 shadow-lg transition-opacity duration-200 group-hover/avatar:opacity-100"
            >
              {member.name}
            </span>
          </li>
        ))}
      </ul>

      {rest > 0 && (
        <span
          className={cn(AVATAR, "rv-pcard-pill -ml-2.5 grid place-items-center text-[11px] font-semibold @lg/pcard:text-xs @5xl/pcard:-ml-3")}
          style={{ color: "var(--pc-accent)", borderColor: tint("var(--pc-accent)", 35, "var(--border)") }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

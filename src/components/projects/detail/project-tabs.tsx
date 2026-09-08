"use client";

/*
  The section navigation. No shadcn Tabs primitive exists in this app, and the
  brief says not to add packages, so this is a small self-contained tab bar in
  the same spirit as `ui/range-toggle.tsx`: a real `role="tablist"` of buttons,
  a violet active label, and a shared underline that slides between tabs via a
  `motion` layout animation (and simply snaps under reduced motion).

  It scrolls horizontally rather than squeezing every tab into a phone's width.
  This is presentational — it reports the active tab up through `onChange` but
  keeps its own state if the caller doesn't care, so the preview needs no wiring.
*/

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export const DEFAULT_PROJECT_TABS = ["Overview", "Milestones", "Tasks", "Activity", "Settings"] as const;

export function ProjectTabs({
  tabs = [...DEFAULT_PROJECT_TABS],
  value,
  onChange,
  className,
}: {
  tabs?: string[];
  value?: string;
  onChange?: (tab: string) => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const layoutId = useId();
  const [internal, setInternal] = useState(tabs[0]);
  const active = value ?? internal;

  return (
    <div
      role="tablist"
      aria-label="Project sections"
      className={cn(
        "-mx-1 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-border px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              setInternal(tab);
              onChange?.(tab);
            }}
            className={cn(
              "relative shrink-0 rounded-t-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors sm:px-4",
              "focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
              isActive ? "text-accent-purple" : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            {tab}
            {isActive && (
              <motion.span
                layoutId={`${layoutId}-underline`}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-purple"
                style={{ boxShadow: "0 0 10px var(--accent-purple)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

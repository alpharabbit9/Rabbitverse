"use client";

/*
  The numbered card the Create New Project page is built out of.

  Three of them, 1 / 2 / 3, each a glass surface with a gradient number badge, a
  title, a line of explanation and an optional control on the right. Sections 2
  and 3 arrive after the model answers, so the whole card fades and rises into
  place — `motion` handles that, and honours prefers-reduced-motion itself.
*/

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function CreateSection({
  step,
  title,
  description,
  action,
  animate = false,
  className,
  children,
}: {
  step: number;
  title: string;
  description: string;
  /** Rendered top-right of the header — "Regenerate", "Edit Milestones". */
  action?: React.ReactNode;
  /** Fade + rise on mount. Set for the sections that appear after generation. */
  animate?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = `create-section-${step}`;

  return (
    <motion.section
      aria-labelledby={headingId}
      initial={animate ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn("glass rounded-2xl p-4 sm:p-6", className)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-purple to-accent-blue text-xs font-bold text-white shadow-[0_4px_14px_-4px_var(--accent-purple)]"
          >
            {step}
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="text-base font-semibold leading-tight">
              {title}
            </h2>
            <p className="mt-1 text-xs text-fg-muted sm:text-[13px]">{description}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

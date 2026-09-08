"use client";

/*
  The card's progress ring — the fluid sibling of `ui/ring.tsx`.

  `<Ring/>` is sized in pixels by a prop, which is right for the fixed places it
  is used but wrong here: this ring shrinks from 160px to 96px across the
  card's container breakpoints, and an SVG without a viewBox does not scale with
  its box. So the geometry is drawn in a 100x100 user space and the element is
  sized by CSS, which lets the caller say `size-24 @lg/pcard:size-32
  @5xl/pcard:size-40` and mean it.

  The sweep animates from empty on mount and eases to any new value after that —
  `motion` interpolates `strokeDashoffset` either way — unless the reader has
  asked for less motion, in which case it simply is where it should be.
*/

import { motion, useReducedMotion } from "motion/react";
import { tint } from "./status";
import { clamp, cn } from "@/lib/utils";

const R = 45;
const STROKE = 7;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function ProgressRing({
  value,
  accent,
  id,
  className,
  children,
}: {
  value: number;
  accent: string;
  /** Makes this ring's gradient unique on a page full of them. */
  id: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const offset = CIRCUMFERENCE - (clamp(value, 0, 100) / 100) * CIRCUMFERENCE;
  // A url(#…) reference is not a CSS selector, but project ids arrive from the
  // database and there is no reason to trust them with the fragment syntax.
  const gradientId = `rv-pcard-ring-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90 overflow-visible" aria-hidden focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} />
            {/* A lighter tip, so the sweep reads as lit rather than painted. */}
            <stop offset="100%" stopColor={tint(accent, 66, "#ffffff")} />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r={R} fill="none" stroke={tint("var(--fg)", 10)} strokeWidth={STROKE} />

        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: reduceMotion ? offset : CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduceMotion ? 0 : 1.1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 5px ${tint(accent, 55)})` }}
        />
      </svg>

      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

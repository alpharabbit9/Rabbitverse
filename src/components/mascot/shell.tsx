"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MascotProps, MascotState } from "./types";

/*
  Everything about the mascot that isn't the animal.

  The aura, the four motion presets, the charge streaks, the sleep drift and the
  victory shards all live here, so every species moves identically and only the
  SVG body changes between them. A species file is therefore just a `<defs>` and
  a handful of polygons — see `rabbit.tsx` for the reference implementation.

  All bodies are drawn on the same 120x120 grid with the head occupying roughly
  y=47..106, which is why the crest, sleep bubbles and shards can be positioned
  once here and still land correctly on a dragon and on a cat.
*/

/** Eyes are the tell: calm cyan → hunting orange → victorious gold. */
export function eyeColorFor(state: MascotState): string {
  return state === "celebrating" ? "#ffd166" : state === "running" ? "#ff7a45" : "#61d7ff";
}

/** What a species' body gets handed so it doesn't re-derive the state. */
export interface MascotBody {
  state: MascotState;
  eyeColor: string;
  sleeping: boolean;
  running: boolean;
  celebrating: boolean;
}

/**
 * The crest — ears, horns, tufts. Wrapped here so every species' headgear
 * shakes with the same victory rhythm around the same pivot.
 */
export function Crest({ celebrating, children }: { celebrating: boolean; children: ReactNode }) {
  return (
    <motion.g
      animate={celebrating ? { rotate: [-2, 2, -2] } : {}}
      transition={{ duration: 0.9, repeat: Infinity }}
      style={{ transformOrigin: "60px 58px" }}
    >
      {children}
    </motion.g>
  );
}

export function MascotShell({
  state = "walking",
  size = 120,
  glow = true,
  className,
  children,
}: MascotProps & { children: (body: MascotBody) => ReactNode }) {
  const sleeping = state === "sleeping";
  const running = state === "running";
  const celebrating = state === "celebrating";

  // Warrior motion: steady & powerful, never bouncy/cute.
  const wrap =
    sleeping
      ? { animate: { scale: [1, 1.015, 1] }, transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const } }
      : running
        ? { animate: { x: [-2, 2, -2], rotate: [-9, -7, -9] }, transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" as const } }
        : celebrating
          ? { animate: { y: [0, -7, 0], scale: [1, 1.04, 1] }, transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" as const } }
          : { animate: { y: [0, -3, 0] }, transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const } };

  const eyeColor = eyeColorFor(state);
  const auraStrength = celebrating || running ? 0.6 : sleeping ? 0.22 : 0.4;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, rgba(139,92,246,${auraStrength}), transparent 66%)` }}
        />
      )}

      {/* charge streaks */}
      {running && (
        <div className="absolute right-full top-1/2 flex -translate-y-1/2 flex-col gap-1 pr-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-[2.5px] rounded-full"
              style={{ width: 18 - i * 4, background: eyeColor }}
              animate={{ opacity: [0, 1, 0], x: [8, -8, 8] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.07 }}
            />
          ))}
        </div>
      )}

      <motion.svg
        {...wrap}
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
        style={{ transform: running ? "rotate(-8deg)" : undefined }}
      >
        {children({ state, eyeColor, sleeping, running, celebrating })}

        {/*
          The sleep drift rises on `y` (a transform) rather than on the `cy`
          attribute: motion hands SVG geometry attributes to the DOM verbatim,
          and the first frame of a keyframe array arrives undefined, which the
          browser rejects with "attribute cy: Expected length". Same motion,
          no console noise.
        */}
        {sleeping && (
          <g fill="#8B5CF6">
            <motion.circle cx="90" cy="50" r="2" animate={{ opacity: [0, 1, 0], y: [0, -8, -12] }} transition={{ duration: 2.6, repeat: Infinity }} />
            <motion.circle cx="95" cy="44" r="1.4" animate={{ opacity: [0, 1, 0], y: [0, -8, -12] }} transition={{ duration: 2.6, repeat: Infinity, delay: 0.7 }} />
          </g>
        )}
      </motion.svg>

      {/* victory energy shards */}
      {celebrating && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute block h-2 w-[2px] rounded-full"
              style={{ left: `${18 + i * 12}%`, top: "8%", background: i % 2 ? "#ffd166" : "#8b5cf6", transformOrigin: "center" }}
              animate={{ y: [0, -16, 0], opacity: [0, 1, 0], scaleY: [0.6, 1.3, 0.6] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </>
      )}
    </div>
  );
}

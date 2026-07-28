"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type RabbitState = "sleeping" | "walking" | "running" | "celebrating";

export const RABBIT_COPY: Record<RabbitState, string> = {
  sleeping: "Recharging — no activity logged yet",
  walking: "Locked in. The grind has begun.",
  running: "On the hunt — strong progress today.",
  celebrating: "Victory. Achievement unlocked.",
};

/**
 * Rabbit Verse mascot — a battle-ready warrior hare, not a soft cartoon.
 * Angular "esports crest" build: swept blade ears (one battle-notched), a heavy
 * brow, glowing predator eyes, and an armored collar. Code-drawn (v1); a
 * photoreal render can be generated later via Higgsfield from the same direction.
 */
export function Rabbit({
  state = "walking",
  size = 120,
  glow = true,
  className,
}: {
  state?: RabbitState;
  size?: number;
  glow?: boolean;
  className?: string;
}) {
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

  const eyeColor = celebrating ? "#ffd166" : running ? "#ff7a45" : "#61d7ff";
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
        <defs>
          <linearGradient id="rvsteel" x1="30" y1="20" x2="90" y2="112" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBFDFF" />
            <stop offset="0.55" stopColor="#D7DEF2" />
            <stop offset="1" stopColor="#AEB8D6" />
          </linearGradient>
          <linearGradient id="rvarmor" x1="42" y1="98" x2="78" y2="116" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#5B7CFA" />
          </linearGradient>
          <linearGradient id="rvear" x1="40" y1="10" x2="60" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E9ECFA" />
            <stop offset="1" stopColor="#B9C2DE" />
          </linearGradient>
        </defs>

        {/* ---- ears: swept-back blades, right ear battle-notched ---- */}
        <motion.g
          animate={celebrating ? { rotate: [-2, 2, -2] } : {}}
          transition={{ duration: 0.9, repeat: Infinity }}
          style={{ transformOrigin: "60px 58px" }}
        >
          <polygon points="49,57 33,55 24,13 45,30" fill="url(#rvear)" stroke="#95A0C4" strokeWidth="1" strokeLinejoin="round" />
          <polygon points="47,52 37,49 31,24 44,36" fill="#7C5CF5" opacity="0.45" />
          {/* right ear with a V notch near the tip */}
          <polygon points="71,57 87,55 96,13 90,26 92,20 82,29 75,30" fill="url(#rvear)" stroke="#95A0C4" strokeWidth="1" strokeLinejoin="round" />
          <polygon points="73,52 83,49 89,24 76,36" fill="#7C5CF5" opacity="0.45" />
        </motion.g>

        {/* ---- head: angular shield ---- */}
        <polygon points="60,47 86,64 83,92 60,106 37,92 34,64" fill="url(#rvsteel)" stroke="#8A94B8" strokeWidth="1.2" strokeLinejoin="round" />
        {/* facet shading */}
        <polygon points="60,47 60,106 37,92 34,64" fill="#000" opacity="0.06" />
        <polygon points="60,47 34,64 47,60" fill="#fff" opacity="0.5" />

        {/* ---- heavy brow (fierce) ---- */}
        <polygon points="39,64 57,73 60,70 63,73 81,64 80,70 62,79 60,76 58,79 40,70" fill="#2A3350" />

        {/* ---- predator eyes ---- */}
        <g style={{ filter: `drop-shadow(0 0 4px ${eyeColor})` }}>
          {sleeping ? (
            <>
              <rect x="44" y="76" width="12" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
              <rect x="64" y="76" width="12" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
            </>
          ) : (
            <>
              <polygon points="44,74 55,77 52,82 44,79" fill={eyeColor} />
              <polygon points="76,74 65,77 68,82 76,79" fill={eyeColor} />
            </>
          )}
        </g>

        {/* ---- muzzle + nose + set jaw ---- */}
        <polygon points="53,83 67,83 60,99" fill="#EDF1FF" opacity="0.9" />
        <polygon points="56,86 64,86 60,91" fill="#1B2138" />
        <path d={celebrating ? "M54 93c3 4 9 4 12 0" : "M55 93h10"} stroke="#1B2138" strokeWidth="2.4" strokeLinecap="round" fill="none" />

        {/* ---- armored collar (built for glory) ---- */}
        <polygon points="42,101 60,111 78,101 71,99 60,106 49,99" fill="url(#rvarmor)" stroke="#6d4bf0" strokeWidth="0.8" strokeLinejoin="round" />
        <polygon points="57,104 60,108 63,104 60,105" fill="#EAE6FF" opacity="0.9" />

        {sleeping && (
          <g fill="#8B5CF6">
            <motion.circle cx="90" cy="50" r="2" animate={{ opacity: [0, 1, 0], cy: [50, 42, 38] }} transition={{ duration: 2.6, repeat: Infinity }} />
            <motion.circle cx="95" cy="44" r="1.4" animate={{ opacity: [0, 1, 0], cy: [44, 36, 32] }} transition={{ duration: 2.6, repeat: Infinity, delay: 0.7 }} />
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

"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type RabbitState = "sleeping" | "walking" | "running" | "celebrating";

export const RABBIT_COPY: Record<RabbitState, string> = {
  sleeping: "Resting — no activity yet today",
  walking: "You logged something. Nice start!",
  running: "Great progress today!",
  celebrating: "Achievement unlocked!",
};

/**
 * Code-drawn brand mascot with four reactive states. This is the v1 placeholder;
 * the richer rendered rabbit art will be generated later via the Higgsfield MCP.
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
  const celebrating = state === "celebrating";
  const running = state === "running";

  const wrap =
    state === "sleeping"
      ? { animate: { y: [0, -2, 0] }, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } }
      : state === "walking"
        ? { animate: { y: [0, -6, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } }
        : state === "running"
          ? { animate: { x: [-3, 3, -3], y: [0, -4, 0] }, transition: { duration: 0.7, repeat: Infinity, ease: "easeInOut" as const } }
          : { animate: { y: [0, -12, 0] }, transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background:
              running || celebrating
                ? "radial-gradient(circle, rgba(139,92,246,0.5), transparent 65%)"
                : "radial-gradient(circle, rgba(91,124,250,0.32), transparent 65%)",
          }}
        />
      )}

      {running && (
        <div className="absolute right-full top-1/2 flex -translate-y-1/2 gap-1 pr-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-[2px] rounded-full"
              style={{ width: 14 - i * 3, background: "var(--accent-blue)" }}
              animate={{ opacity: [0, 1, 0], x: [6, -6, 6] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08 }}
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
          <linearGradient id="rvfur" x1="30" y1="20" x2="90" y2="110" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#E7ECFF" />
          </linearGradient>
        </defs>

        {/* ears */}
        <motion.g
          animate={celebrating ? { rotate: [-4, 4, -4] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ transformOrigin: "60px 70px" }}
        >
          <path d="M46 66c-5-18-7-34-3-42 4-7 11-3 13 5 3 9 4 25 3 37" fill="url(#rvfur)" />
          <path d="M74 66c5-18 7-34 3-42-4-7-11-3-13 5-3 9-4 25-3 37" fill="url(#rvfur)" />
          <path d="M50 58c-3-11-4-22-2-27" stroke="#C9B8FF" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M70 58c3-11 4-22 2-27" stroke="#C9B8FF" strokeWidth="3.5" strokeLinecap="round" />
        </motion.g>

        {/* body / head */}
        <ellipse cx="60" cy="80" rx="34" ry="30" fill="url(#rvfur)" />

        {/* hoodie hint */}
        <path d="M30 86a30 30 0 0 0 60 0c0 10-13 20-30 20S30 96 30 86Z" fill="#5B7CFA" opacity="0.9" />

        {/* eyes */}
        {sleeping ? (
          <>
            <path d="M46 78c3 3 8 3 11 0" stroke="#0B1020" strokeWidth="3" strokeLinecap="round" />
            <path d="M63 78c3 3 8 3 11 0" stroke="#0B1020" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="51" cy="77" r="4.5" fill="#0B1020" />
            <circle cx="69" cy="77" r="4.5" fill="#0B1020" />
            <circle cx="52.4" cy="75.6" r="1.5" fill="#fff" />
            <circle cx="70.4" cy="75.6" r="1.5" fill="#fff" />
          </>
        )}

        {/* cheeks + mouth */}
        <circle cx="44" cy="88" r="5" fill="#FFB7D5" opacity="0.7" />
        <circle cx="76" cy="88" r="5" fill="#FFB7D5" opacity="0.7" />
        {celebrating ? (
          <path d="M55 90c2 4 8 4 10 0" stroke="#0B1020" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M57 89c1.5 1.6 4.5 1.6 6 0" stroke="#0B1020" strokeWidth="2.6" strokeLinecap="round" />
        )}

        {sleeping && (
          <g fill="#8B5CF6">
            <motion.text x="86" y="52" fontSize="10" animate={{ opacity: [0, 1, 0], y: [52, 44, 40] }} transition={{ duration: 2.4, repeat: Infinity }}>z</motion.text>
            <motion.text x="92" y="44" fontSize="8" animate={{ opacity: [0, 1, 0], y: [44, 36, 32] }} transition={{ duration: 2.4, repeat: Infinity, delay: 0.6 }}>z</motion.text>
          </g>
        )}
      </motion.svg>

      {celebrating && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-sm"
              style={{ left: `${15 + i * 13}%`, top: "10%" }}
              animate={{ y: [0, -14, 0], opacity: [0, 1, 0], rotate: [0, 40, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
            >
              ✨
            </motion.span>
          ))}
        </>
      )}
    </div>
  );
}

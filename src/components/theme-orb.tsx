"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "Day / Night Orb" theme toggle — one orb, different glow.
 * Warm amber sun in light mode, cool blue night in dark mode; the two glows
 * cross-fade on toggle. Replaces the old icon button everywhere.
 */

const DAY = {
  bg: "radial-gradient(circle at 34% 28%, #fff4cf 0%, #ffd166 26%, #ff9e3d 58%, #ef6f27 100%)",
  glow: "0 0 22px 4px rgba(255,158,64,0.7), 0 0 9px rgba(255,209,102,0.95)",
  halo: "radial-gradient(circle, rgba(255,158,64,0.7), transparent 68%)",
};
const NIGHT = {
  bg: "radial-gradient(circle at 34% 28%, #e8efff 0%, #8fabff 24%, #4460e0 58%, #182a66 100%)",
  glow: "0 0 22px 4px rgba(91,124,250,0.7), 0 0 9px rgba(120,150,255,0.85)",
  halo: "radial-gradient(circle, rgba(91,124,250,0.7), transparent 68%)",
};

export function ThemeOrb({ size = 34, className }: { size?: number; className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // First render (server + pre-mount client) both assume dark → no hydration mismatch.
  const isDark = !mounted ? true : resolvedTheme !== "light";
  const orb = isDark ? NIGHT : DAY;

  return (
    <button
      type="button"
      suppressHydrationWarning
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group relative shrink-0 rounded-full outline-none transition-transform duration-300 hover:scale-105 active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:ring-white/40",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* ambient halo */}
      <span
        className="pointer-events-none absolute -inset-[5px] rounded-full opacity-80 blur-lg transition-[background] duration-500"
        style={{ background: orb.halo }}
      />
      {/* day sphere */}
      <span
        className="absolute inset-0 rounded-full transition-opacity duration-500"
        style={{ opacity: isDark ? 0 : 1, background: DAY.bg, boxShadow: `${DAY.glow}, inset 0 0 0 1px rgba(255,255,255,0.35)` }}
      />
      {/* night sphere */}
      <span
        className="absolute inset-0 rounded-full transition-opacity duration-500"
        style={{ opacity: isDark ? 1 : 0, background: NIGHT.bg, boxShadow: `${NIGHT.glow}, inset 0 0 0 1px rgba(255,255,255,0.28)` }}
      />
      {/* glossy specular highlight */}
      <span className="pointer-events-none absolute left-[27%] top-[22%] size-1.5 rounded-full bg-white/75 blur-[1px]" />
    </button>
  );
}

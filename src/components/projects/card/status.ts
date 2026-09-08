/*
  One row per status, and one colour per row.

  Every tinted thing on the card — the border, the outer glow, the logo well,
  the ring, the tag icons, the "+N" bubble — derives from that single colour via
  `--pc-accent`. Nothing downstream needs to know which status it is looking at.

  The colours are tokens, never literals, because Rabbit Verse's light theme is
  its own design rather than an inversion: `--accent-purple` is a different hex
  in each theme, and a hardcoded #8b5cf6 would be wrong in one of them.
*/

import type { ProjectCardStatus } from "./types";

export interface ProjectStatusMeta {
  /** Read out as-is, so status never depends on colour alone. */
  label: string;
  color: string;
}

export const PROJECT_STATUS: Record<ProjectCardStatus, ProjectStatusMeta> = {
  planned: { label: "Planned", color: "var(--accent-blue)" },
  in_progress: { label: "In progress", color: "var(--accent-purple)" },
  completed: { label: "Completed", color: "var(--accent-mint)" },
  on_hold: { label: "On hold", color: "var(--accent-gold)" },
  // Archived is the one status with no hue: it should recede, not glow.
  archived: { label: "Archived", color: "var(--fg-muted)" },
};

/**
 * Mix `pct`% of an accent into `base`.
 *
 * `color-mix` is what keeps the derived tints theme-correct without a second
 * palette: mixing an accent with `var(--fg)` lightens it on dark and darkens it
 * on light, because `--fg` flips. Mixing with `transparent` gives an alpha of a
 * colour that is only known at runtime, which `rgba()` cannot do.
 */
export function tint(color: string, pct: number, base = "transparent"): string {
  return `color-mix(in srgb, ${color} ${pct}%, ${base})`;
}

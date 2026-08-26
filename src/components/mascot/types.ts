/*
  The mascot layer's vocabulary — pure data, no React, no "use client".

  Kept free of the components on purpose: `lib/session.ts` and the settings
  action need to validate a species string on the server without dragging six
  client-component modules into that module graph. `registry.ts` is where the
  species meet their drawings.
*/

/** The four poses every species can strike. Derived from the day's activity. */
export type MascotState = "sleeping" | "walking" | "running" | "celebrating";

/** Every creature a user can pick. The stored value in `user_profiles.mascot`. */
export const MASCOT_SPECIES = ["rabbit", "fox", "wolf", "owl", "cat", "dragon"] as const;

export type MascotSpecies = (typeof MASCOT_SPECIES)[number];

/** The species a fresh profile gets, and what demo mode always shows. */
export const DEFAULT_MASCOT: MascotSpecies = "rabbit";

/** What the mascot says about each pose. Same four beats, different voice. */
export type MascotCopy = Record<MascotState, string>;

/** Shared props — every species renders through the same contract. */
export interface MascotProps {
  state?: MascotState;
  size?: number;
  glow?: boolean;
  className?: string;
}

export const MASCOT_NAMES: Record<MascotSpecies, string> = {
  rabbit: "Rabbit",
  fox: "Fox",
  wolf: "Wolf",
  owl: "Owl",
  cat: "Cat",
  dragon: "Dragon",
};

export const MASCOT_COPY: Record<MascotSpecies, MascotCopy> = {
  rabbit: {
    sleeping: "Recharging — no activity logged yet",
    walking: "Locked in. The grind has begun.",
    running: "On the hunt — strong progress today.",
    celebrating: "Victory. Achievement unlocked.",
  },
  fox: {
    sleeping: "Curled up — nothing logged yet",
    walking: "Circling the target. Patient work.",
    running: "Closing in — the day is going your way.",
    celebrating: "Outsmarted it. Clean win.",
  },
  wolf: {
    sleeping: "Resting the pack — no activity yet",
    walking: "Holding the line. Steady pace.",
    running: "Running the ridge — momentum is yours.",
    celebrating: "The pack eats tonight.",
  },
  owl: {
    sleeping: "Eyes closed — the night is quiet",
    walking: "Watching. Every log is noted.",
    running: "Wide awake and gaining altitude.",
    celebrating: "Called it. A near-perfect day.",
  },
  cat: {
    sleeping: "Asleep on the windowsill — nothing yet",
    walking: "Stalking the day, one step at a time.",
    running: "Full sprint. Nothing gets away today.",
    celebrating: "Landed it. Naturally.",
  },
  dragon: {
    sleeping: "Dormant — the fire is banked",
    walking: "Stirring. The hoard grows slowly.",
    running: "Wings out — burning through the day.",
    celebrating: "The sky is yours. Total victory.",
  },
};

/**
 * Coerce whatever the database (or a tampered form post) hands us into a
 * species we can actually draw. An unknown value falls back to the rabbit
 * rather than rendering nothing.
 */
export function resolveMascot(value: unknown): MascotSpecies {
  return typeof value === "string" && (MASCOT_SPECIES as readonly string[]).includes(value)
    ? (value as MascotSpecies)
    : DEFAULT_MASCOT;
}

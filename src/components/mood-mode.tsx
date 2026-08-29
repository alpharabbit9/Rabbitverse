"use client";

import { use, useEffect } from "react";
import type { MoodState } from "@/lib/types";

/**
 * Mood Mode — writes the week's mood onto <html data-mood> so the ambient aura
 * (and any mood-aware styles) subtly reflect how the week is going. The mood is
 * derived from real signals server-side (moodState) and passed in, so the aura
 * matches the dashboard. Rendered inside the app shell; the marketing/login
 * routes fall back to the neutral default glow.
 *
 * Takes the *promise* rather than the value: the layout hands it over without
 * awaiting, so the shell and the page below it paint while the five signal
 * queries are still running. It renders nothing, so its Suspense fallback is
 * `null` and there is nothing to flash.
 */
export function MoodMode({ mood: moodPromise }: { mood: Promise<MoodState> }) {
  const mood = use(moodPromise);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.mood = mood;
    return () => {
      delete el.dataset.mood;
    };
  }, [mood]);
  return null;
}

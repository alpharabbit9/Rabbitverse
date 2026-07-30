"use client";

import { useEffect } from "react";
import type { MoodState } from "@/lib/types";

/**
 * Mood Mode — writes the week's mood onto <html data-mood> so the ambient aura
 * (and any mood-aware styles) subtly reflect how the week is going. The mood is
 * derived from real signals server-side (moodState) and passed in, so the aura
 * matches the dashboard. Rendered inside the app shell; the marketing/login
 * routes fall back to the neutral default glow.
 */
export function MoodMode({ mood }: { mood: MoodState }) {
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.mood = mood;
    return () => {
      delete el.dataset.mood;
    };
  }, [mood]);
  return null;
}

"use client";

import { useEffect } from "react";
import { mood } from "@/lib/sample-data";

/**
 * Mood Mode — writes the week's mood onto <html data-mood> so the ambient aura
 * (and any mood-aware styles) subtly reflect how the week is going. Driven by
 * sample data for now; will read the real weekly signals once data is live.
 */
export function MoodMode() {
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.mood = mood;
    return () => {
      delete el.dataset.mood;
    };
  }, []);
  return null;
}

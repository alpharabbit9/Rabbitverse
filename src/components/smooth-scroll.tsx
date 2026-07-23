"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Global smooth scrolling via Lenis. Runs in "root" (window) mode so `position: sticky`
 * (mobile header) and `position: fixed` (tab bar) keep working, and native scroll events
 * still fire for the nav's auto-minimize behavior.
 *
 * Touch scrolling stays native — smoothing wheel/trackpad only avoids fighting iOS
 * momentum and rubber-banding on the phone. Disabled entirely under reduced-motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false, // keep native touch scroll on mobile
    });

    let frame = requestAnimationFrame(function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReduceMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Read the OS "reduce motion" setting as an external store rather than syncing
 * it into state from an effect — the effect version tripped React 19's
 * set-state-in-effect rule and cost an extra render on every mount.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReduceMotion,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false, // server render: assume motion is fine, the client corrects it
  );
}

/** Animated count-up number. Respects prefers-reduced-motion. */
export function CountUp({
  value,
  duration = 1000,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const [animated, setAnimated] = useState(0);
  const ref = useRef<number>(0);

  // With motion reduced the final value is simply what we render — no state,
  // no effect, nothing to tick.
  const display = reduce ? value : animated;

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    const from = ref.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimated(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else ref.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

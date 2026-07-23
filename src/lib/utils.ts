import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with correct precedence. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a BDT (Bangladeshi taka) amount. */
export function taka(amount: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && Math.abs(amount) >= 1000) {
    return `৳${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return `৳${amount.toLocaleString("en-US")}`;
}

/** Clamp a number to a range. */
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

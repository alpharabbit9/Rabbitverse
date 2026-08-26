import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with correct precedence. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number to a range. */
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/*
  Body-composition helpers. Pure and dependency-free so both the server pages
  and the client views can read them, and so the thresholds live in exactly one
  place instead of being re-stated as UI copy.
*/

/** The four standard adult BMI bands (WHO). */
export type BmiBand = "under" | "healthy" | "above" | "high";

export interface BmiReading {
  /** BMI rounded to one decimal, the way the UI shows it. */
  value: number;
  band: BmiBand;
  /** Short caption for the stat card. */
  label: string;
  /** Design token for the caption, following the band's severity. */
  accent: string;
}

const BANDS: Record<BmiBand, { label: string; accent: string }> = {
  under: { label: "Below healthy range", accent: "var(--accent-gold)" },
  healthy: { label: "Healthy range", accent: "var(--accent-mint)" },
  above: { label: "Above healthy range", accent: "var(--accent-orange)" },
  high: { label: "Well above healthy range", accent: "var(--accent-rose)" },
};

/** Classify a BMI number into its band. */
export function bmiBand(value: number): BmiBand {
  if (value < 18.5) return "under";
  if (value < 25) return "healthy";
  if (value < 30) return "above";
  return "high";
}

/**
 * BMI from a weight + height, or `null` when either is missing/nonsensical.
 * Returning the caption alongside the number is deliberate: the caption used to
 * be hardcoded to "Healthy range", so a BMI of 31 was labelled healthy.
 */
export function bmiFrom(weightKg: number | undefined, heightCm: number | null | undefined): BmiReading | null {
  if (!weightKg || weightKg <= 0 || !heightCm || heightCm <= 0) return null;
  const value = +(weightKg / (heightCm / 100) ** 2).toFixed(1);
  if (!Number.isFinite(value)) return null;
  const band = bmiBand(value);
  return { value, band, label: BANDS[band].label, accent: BANDS[band].accent };
}

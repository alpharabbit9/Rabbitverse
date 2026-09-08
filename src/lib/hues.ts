/*
  The accent palette, as hue angles.

  `globals.css` defines each accent as a hex colour, which is right for fills and
  text. The button (`.rv-btn`) needs something else: it derives a whole family of
  colours from one accent — a rim, a bottom glow, a pressed tint, each at its own
  lightness and alpha — so it takes the *hue* and builds the rest with `hsl()`.

  These are the hue angles of the `--accent-*` hexes in `globals.css`, rounded to
  the degree. If an accent changes there, change it here too; nothing computes
  one from the other at runtime.
*/

export const HUE = {
  purple: 258,
  blue: 228,
  cyan: 195,
  mint: 153,
  gold: 40,
  orange: 31,
  rose: 353,
} as const;

export type HueName = keyof typeof HUE;

/** Accept either a named accent or a raw angle, so callers can do both. */
export function hueValue(hue: HueName | number): number {
  return typeof hue === "number" ? hue : HUE[hue];
}

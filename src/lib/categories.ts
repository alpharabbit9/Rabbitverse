/*
  What a user may put on one of their own spend categories.

  Pure data + validation, no React: the Settings card renders these lists and
  the Server Action re-checks every field against them, so a hand-forged post
  cannot park an unknown icon name (which would render as a fallback sparkle) or
  an arbitrary CSS string (which lands in a `style` attribute) in the column.
*/

/** The icons offered in the picker — a subset of the app's icon registry. */
export const CATEGORY_ICONS = [
  "Utensils", "Coffee", "Bus", "Car", "Plane", "ShoppingBag", "Shirt", "Gift", "ReceiptText",
  "HeartPulse", "Dumbbell", "BookOpen", "GraduationCap", "Music", "Film", "Smartphone", "Wrench",
  "PawPrint", "Package", "PiggyBank", "Home", "Wallet", "Sparkles",
] as const;

/**
 * The palette. Theme tokens rather than hex, so a category recoloured in dark
 * mode still reads correctly in light mode — both themes define these vars.
 */
export const CATEGORY_COLORS = [
  { value: "var(--accent-mint)", label: "Mint" },
  { value: "var(--accent-cyan)", label: "Cyan" },
  { value: "var(--accent-blue)", label: "Blue" },
  { value: "var(--accent-purple)", label: "Purple" },
  { value: "var(--accent-gold)", label: "Gold" },
  { value: "var(--accent-orange)", label: "Orange" },
  { value: "var(--accent-rose)", label: "Rose" },
] as const;

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0].value;
export const DEFAULT_CATEGORY_ICON = "Sparkles";

/** How long a category name may be — long enough for "Groceries & household". */
export const CATEGORY_NAME_MAX = 30;

export function isCategoryIcon(value: unknown): value is (typeof CATEGORY_ICONS)[number] {
  return typeof value === "string" && (CATEGORY_ICONS as readonly string[]).includes(value);
}

export function isCategoryColor(value: unknown): boolean {
  return typeof value === "string" && CATEGORY_COLORS.some((c) => c.value === value);
}

/** Trimmed, collapsed and length-capped. Empty means "not a usable name". */
export function normalizeCategoryName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, CATEGORY_NAME_MAX);
}

/** Case-insensitive duplicate check against the names already in use. */
export function isDuplicateName(name: string, existing: string[]): boolean {
  const n = name.toLowerCase();
  return existing.some((e) => e.toLowerCase() === n);
}

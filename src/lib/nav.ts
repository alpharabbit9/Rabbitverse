import type { SectionKey } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide-react icon name
  section?: SectionKey;
  accent: string; // css var token name
}

/** Primary sidebar navigation. Order matches the design mockups. */
export const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: "LayoutDashboard", accent: "var(--primary)" },
  { href: "/projects", label: "Projects", icon: "FolderKanban", section: "projects", accent: "var(--accent-blue)" },
  { href: "/workout", label: "Workout", icon: "Dumbbell", section: "workout", accent: "var(--accent-purple)" },
  { href: "/expenses", label: "Expenses", icon: "Wallet", section: "expenses", accent: "var(--accent-mint)" },
  { href: "/mental-health", label: "Mental Health", icon: "HeartPulse", section: "mental", accent: "var(--accent-orange)" },
];

export const SETTINGS_NAV: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: "Settings",
  accent: "var(--fg-muted)",
};

/** Bottom-tab items for mobile (center + button handled separately). */
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Overview", icon: "Home", accent: "var(--primary)" },
  { href: "/expenses", label: "Money", icon: "Wallet", section: "expenses", accent: "var(--accent-mint)" },
  { href: "/workout", label: "Body", icon: "Dumbbell", section: "workout", accent: "var(--accent-purple)" },
  { href: "/mental-health", label: "Mind", icon: "HeartPulse", section: "mental", accent: "var(--accent-orange)" },
];

export const SECTION_META: Record<
  SectionKey,
  { label: string; icon: string; accent: string; heatColor: string }
> = {
  projects: { label: "Projects", icon: "FolderKanban", accent: "var(--accent-blue)", heatColor: "#5b7cfa" },
  workout: { label: "Workout", icon: "Dumbbell", accent: "var(--accent-purple)", heatColor: "#8b5cf6" },
  expenses: { label: "Expenses", icon: "Wallet", accent: "var(--accent-mint)", heatColor: "#4de3a0" },
  mental: { label: "Mental Health", icon: "HeartPulse", accent: "var(--accent-orange)", heatColor: "#ffb15e" },
};

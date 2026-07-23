import Link from "next/link";
import { ThemeOrb } from "@/components/theme-orb";

/**
 * Floating "liquid glass" top bar for mobile only (the sidebar carries branding
 * on desktop). Rounded, translucent, and detached from the screen edges — it
 * gives the logo a home on phones and holds the Day/Night orb in the top-right.
 */
export function MobileHeader() {
  return (
    <div className="sticky top-0 z-30 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] lg:hidden">
      <header className="glass-strong flex items-center justify-between gap-3 rounded-[22px] px-3.5 py-2.5 shadow-[0_12px_34px_-14px_rgba(0,0,0,0.7)]">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Rabbit Verse" className="size-9 rounded-xl object-cover shadow-[0_4px_14px_-4px_rgba(91,124,250,0.55)] ring-1 ring-white/10" />
          <span className="font-display text-[18px] font-semibold tracking-tight">Rabbit Verse</span>
        </Link>
        <ThemeOrb size={34} />
      </header>
    </div>
  );
}

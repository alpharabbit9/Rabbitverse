import Link from "next/link";
import { ThemeOrb } from "@/components/theme-orb";

/**
 * Mobile-only top bar (the sidebar carries branding on desktop). Floats with the
 * same `px-4` side gaps as the bottom nav, hugs the top of the screen (notch-aware
 * via the safe-area inset), with rounded top corners and a straight bottom edge.
 */
export function MobileHeader() {
  return (
    <div className="sticky top-0 z-30 px-4 lg:hidden">
      <header className="glass-strong flex items-center justify-between gap-3 rounded-b-none rounded-t-[22px] border-0 border-b border-border-strong px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.6rem)]">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Rabbit Verse" className="size-9 rounded-xl object-cover shadow-[0_4px_14px_-4px_rgba(91,124,250,0.55)] ring-1 ring-white/10" />
          <span className="font-display text-[18px] font-semibold tracking-tight">Rabbit Verse</span>
        </Link>
        <ThemeOrb size={28} />
      </header>
    </div>
  );
}

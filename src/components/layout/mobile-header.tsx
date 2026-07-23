import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Slim, glassy top bar for mobile only (the sidebar carries branding on desktop).
 * Gives the Rabbit Verse logo a home on phones and surfaces the theme toggle,
 * which otherwise lives only in the hidden sidebar.
 */
export function MobileHeader() {
  return (
    <header className="glass-strong sticky top-0 z-30 flex items-center justify-between gap-3 border-0 border-b border-border-strong px-4 py-2.5 lg:hidden">
      <Link href="/" className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Rabbit Verse" className="size-8 rounded-lg ring-1 ring-white/10" />
        <span className="text-[15px] font-semibold tracking-tight">Rabbit Verse</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}

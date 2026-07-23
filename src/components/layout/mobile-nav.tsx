"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MOBILE_TABS } from "@/lib/nav";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * iOS 26 "Liquid Glass" bottom navigation: a floating, translucent pill that
 * blurs the content behind it, slides a dynamic highlight to the active tab,
 * and auto-minimizes (labels tuck away) as you scroll down.
 */
export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const minimized = useMinimizeOnScroll();

  const left = MOBILE_TABS.slice(0, 2);
  const right = MOBILE_TABS.slice(2);
  const quickActive = pathname.startsWith("/quick-add");

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden">
      <motion.div
        initial={false}
        animate={{ paddingTop: minimized ? 8 : 10, paddingBottom: minimized ? 8 : 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="glass-strong pointer-events-auto flex w-full max-w-md items-center justify-around gap-1 rounded-[28px] px-2.5"
      >
        {left.map((t) => (
          <Tab key={t.href} href={t.href} icon={t.icon} label={t.label} accent={t.accent} active={isActive(t.href)} minimized={minimized} />
        ))}

        <Link
          href="/quick-add"
          aria-label="Quick add"
          className={cn(
            "relative grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-purple to-accent-blue text-white shadow-[0_10px_28px_-6px_rgba(139,92,246,0.75)] transition-transform active:scale-95",
            minimized ? "-mt-3" : "-mt-6",
          )}
          style={{ transition: "margin-top 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/25" />
          {quickActive && <span className="absolute -inset-1 rounded-full bg-accent-purple/30 blur-md" />}
          <Icon name="Plus" size={26} className="relative" />
        </Link>

        {right.map((t) => (
          <Tab key={t.href} href={t.href} icon={t.icon} label={t.label} accent={t.accent} active={isActive(t.href)} minimized={minimized} />
        ))}
      </motion.div>
    </nav>
  );
}

function Tab({
  href,
  icon,
  label,
  accent,
  active,
  minimized,
}: {
  href: string;
  icon: string;
  label: string;
  accent: string;
  active: boolean;
  minimized: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5"
    >
      {active && (
        <motion.span
          layoutId="tab-highlight"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `color-mix(in oklab, ${accent} 20%, transparent)`,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 30%, transparent)`,
          }}
        />
      )}
      <span className="relative grid place-items-center">
        <Icon name={icon} size={21} style={{ color: active ? accent : "var(--fg-muted)" }} />
      </span>
      <motion.span
        initial={false}
        animate={{ height: minimized ? 0 : 13, opacity: minimized ? 0 : 1, marginTop: minimized ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className={cn(
          "relative block overflow-hidden text-[10px] font-medium leading-none",
          active ? "text-fg" : "text-fg-muted",
        )}
      >
        {label}
      </motion.span>
    </Link>
  );
}

/** True while the user is scrolling down (past a small threshold); false near top / scrolling up. */
function useMinimizeOnScroll() {
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > last + 4 && y > 80) setMinimized(true);
        else if (y < last - 4 || y < 40) setMinimized(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return minimized;
}

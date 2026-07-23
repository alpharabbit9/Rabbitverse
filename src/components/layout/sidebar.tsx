"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { NAV, SETTINGS_NAV, type NavItem } from "@/lib/nav";
import { profile } from "@/lib/sample-data";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active ? "text-fg" : "text-fg-secondary hover:text-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl border border-border-strong bg-card-hover"
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      )}
      <span className="relative grid size-6 place-items-center">
        <Icon name={item.icon} size={18} style={{ color: active ? item.accent : undefined }} />
      </span>
      <span className="relative font-medium">{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const xpPct = Math.round((profile.xp / profile.xpToNext) * 100);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-bg-secondary/40 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Rabbit Verse" className="size-10 rounded-xl" />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">Rabbit Verse</div>
          <div className="text-xs text-fg-muted">Your Life OS</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        <div className="flex-1" />
        <NavLink item={SETTINGS_NAV} active={isActive(SETTINGS_NAV.href)} />
      </nav>

      <div className="space-y-3 p-3">
        <div className="glass flex items-center gap-3 rounded-2xl p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue text-sm font-bold text-white">
            {profile.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{profile.name}</div>
            <div className="text-[11px] text-fg-muted">Level {profile.level} · Explorer</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card-hover">
              <div className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-blue" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
            <Icon name="Flame" size={16} style={{ color: "var(--accent-orange)" }} />
            <span className="font-semibold">{profile.streakDays}</span>
            <span className="text-xs text-fg-muted">day streak</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

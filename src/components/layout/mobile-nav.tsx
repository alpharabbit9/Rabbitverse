"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_TABS } from "@/lib/nav";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const left = MOBILE_TABS.slice(0, 2);
  const right = MOBILE_TABS.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="mx-auto flex max-w-lg items-end justify-around border-t border-border bg-bg-secondary/80 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl">
        {left.map((t) => (
          <Tab key={t.href} href={t.href} icon={t.icon} label={t.label} accent={t.accent} active={isActive(t.href)} />
        ))}

        <Link
          href="/quick-add"
          aria-label="Quick add"
          className="relative -mt-6 grid size-14 place-items-center rounded-full bg-gradient-to-br from-accent-purple to-accent-blue text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.7)]"
        >
          <Icon name="Plus" size={26} />
        </Link>

        {right.map((t) => (
          <Tab key={t.href} href={t.href} icon={t.icon} label={t.label} accent={t.accent} active={isActive(t.href)} />
        ))}
      </div>
    </nav>
  );
}

function Tab({ href, icon, label, accent, active }: { href: string; icon: string; label: string; accent: string; active: boolean }) {
  return (
    <Link href={href} className="flex w-16 flex-col items-center gap-1 py-1">
      <Icon name={icon} size={21} style={{ color: active ? accent : "var(--fg-muted)" }} />
      <span className={cn("text-[10px] font-medium", active ? "text-fg" : "text-fg-muted")}>{label}</span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/*
  The admin panel's tab bar.

  `ready: false` renders a tab disabled with a "soon" pill rather than hiding it,
  so the shape of the panel stays honest about where it is going. All four are
  built now; the flag stays because the next tab to be sketched out will want it.
*/

interface AdminTab {
  href: string;
  label: string;
  icon: string;
  ready: boolean;
}

const TABS: AdminTab[] = [
  { href: "/admin", label: "Users", icon: "Users", ready: true },
  { href: "/admin/audit", label: "Audit", icon: "ScrollText", ready: true },
  { href: "/admin/invites", label: "Invites", icon: "Ticket", ready: true },
  { href: "/admin/settings", label: "Settings", icon: "Settings", ready: true },
];

const base =
  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap";

export function AdminNav() {
  const pathname = usePathname();
  // `/admin` is only active on an exact match, or every tab would light up.
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Admin sections">
      {TABS.map((tab) =>
        tab.ready ? (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive(tab.href) ? "page" : undefined}
            className={cn(
              base,
              isActive(tab.href)
                ? "border border-border-strong bg-card-hover text-fg"
                : "border border-transparent text-fg-secondary hover:bg-card-hover hover:text-fg",
            )}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </Link>
        ) : (
          <span
            key={tab.href}
            title="Not built yet"
            aria-disabled="true"
            className={cn(base, "cursor-not-allowed border border-transparent text-fg-muted/60")}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
            <span className="rounded-md bg-card-hover px-1.5 py-0.5 text-[10px] uppercase tracking-wide">soon</span>
          </span>
        ),
      )}
    </nav>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { NAV } from "@/lib/nav";
import { Icon } from "@/components/icon";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Desktop-only top chrome: a section search, a notifications bell, and the
 * primary "Log Activity" action. Hidden on mobile (the MobileHeader covers it).
 */
export function DesktopTopbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const go = () => {
    const term = q.trim().toLowerCase();
    if (!term) return;
    const match = NAV.find((n) => n.label.toLowerCase().includes(term));
    if (match) {
      router.push(match.href);
      setQ("");
    }
  };

  return (
    <div className="mb-6 hidden items-center justify-end gap-3 lg:flex">
      <div className="relative">
        <Icon name="Search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Search sections…"
          aria-label="Search"
          className="glass w-52 rounded-full py-2 pl-9 pr-3 text-sm outline-none transition-[width,border-color] focus:w-64 focus:border-border-strong"
        />
      </div>
      <Button
        size="icon"
        hue="orange"
        onClick={() => toast("You're all caught up ✨", { description: "No new notifications." })}
        aria-label="Notifications"
        className="relative"
      >
        <Icon name="Bell" size={18} />
        <span className="absolute right-1 top-1 size-2 rounded-full bg-accent-orange ring-2 ring-bg" />
      </Button>
      <ButtonLink href="/quick-add" variant="primary" size="lg">
        <Icon name="Plus" size={16} />
        Log Activity
      </ButtonLink>
    </div>
  );
}

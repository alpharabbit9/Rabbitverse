"use client";

import Link from "next/link";
import { NAV } from "@/lib/nav";
import { Icon } from "@/components/icon";

export default function QuickAddPage() {
  const items = NAV.filter((n) => n.section);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Quick Add</h1>
        <p className="mt-1 text-sm text-fg-secondary">What did you do today, Rifat?</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((n) => (
          <Link key={n.href} href={n.href} className="glass flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition-colors hover:border-border-strong">
            <span className="grid size-12 place-items-center rounded-2xl bg-card-hover">
              <Icon name={n.icon} size={22} style={{ color: n.accent }} />
            </span>
            <span className="text-sm font-medium">{n.label}</span>
          </Link>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mb-2 flex items-center gap-2">
          <Icon name="Sparkles" size={16} style={{ color: "var(--accent-purple)" }} />
          <span className="font-semibold">Coming in v2</span>
        </div>
        <p className="text-sm text-fg-secondary">
          Type one sentence — “Worked 3h, ran 5k, spent ৳450 on lunch, feeling good” — and Rabbit will log it to every dashboard automatically.
        </p>
      </div>
    </div>
  );
}

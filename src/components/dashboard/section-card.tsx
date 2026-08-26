import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Sparkline } from "@/components/charts/sparkline";

export function SectionCard({
  href,
  icon,
  label,
  accent,
  primary,
  sub,
  spark,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  accent: string;
  primary: string;
  sub: string;
  spark: number[];
  /** optional status pill, e.g. a TargetBadge when the section is off-track */
  badge?: ReactNode;
}) {
  return (
    <Link href={href} className="glass group flex flex-col justify-between gap-4 rounded-2xl p-5 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-fg-secondary">{label}</span>
          {badge}
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card-hover">
          <Icon name={icon} size={16} style={{ color: accent }} />
        </span>
      </div>
      <div>
        <div className="text-xl font-bold tracking-tight">{primary}</div>
        <div className="text-xs text-fg-muted">{sub}</div>
      </div>
      <div className="opacity-90">
        <Sparkline data={spark} color={accent} width={220} height={36} />
      </div>
    </Link>
  );
}

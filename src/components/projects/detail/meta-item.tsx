/*
  One fact in the header's metadata strip — a small icon, a muted label, and the
  value under it. Rendered from data so the header never repeats this markup.
*/

import { Icon } from "@/components/icon";
import type { ProjectMeta } from "./types";
import { cn } from "@/lib/utils";

export function ProjectMetaItem({ icon, label, value, className }: ProjectMeta & { className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Icon name={icon} size={13} className="shrink-0" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 truncate text-sm font-medium text-fg">{value}</p>
    </div>
  );
}

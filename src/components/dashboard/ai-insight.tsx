import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Teaser for the v2 AI logging feature: type a sentence, every dashboard updates.
 * In v1 this links to the manual quick-add flow.
 */
export function AIInsight() {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative grid size-7 place-items-center rounded-lg bg-card-hover">
          <span className="absolute inset-0 rounded-lg" style={{ boxShadow: "0 0 18px -2px var(--accent-purple)" }} />
          <Icon name="Sparkles" size={15} style={{ color: "var(--accent-purple)" }} />
        </span>
        <h3 className="font-semibold">AI Insight</h3>
        <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-fg-muted">v2</span>
      </div>

      <Link
        href="/quick-add"
        className="flex items-center gap-3 rounded-xl border border-border bg-card-hover/60 px-4 py-3 text-sm text-fg-muted transition-colors hover:border-border-strong"
      >
        <Icon name="PenLine" size={16} />
        <span className="truncate">Worked 3h, gym 1h, spent ৳450, feeling good…</span>
      </Link>
      <p className="mt-3 text-xs text-fg-muted">
        Soon: describe your day in one line and Rabbit updates every dashboard automatically. For now, tap to log manually.
      </p>
    </div>
  );
}

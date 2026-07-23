"use client";

import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  icon: string;
  label: string;
  value: React.ReactNode;
  toneLabel?: string;
  toneColor?: string;
  accent?: string;
  delta?: { dir: "up" | "down"; text: string; good?: boolean };
  spark?: { data: number[]; color?: string };
  progress?: number; // 0-100
  index?: number;
}

export function StatCard({
  icon,
  label,
  value,
  toneLabel,
  toneColor = "var(--accent-mint)",
  accent = "var(--fg-secondary)",
  delta,
  spark,
  progress,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
      className="glass group relative overflow-hidden rounded-2xl p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-fg-secondary">
          <Icon name={icon} size={17} style={{ color: accent }} />
          <span className="text-[13px] font-medium">{label}</span>
        </div>
        {delta && (
          <span
            className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              color: delta.good === false ? "var(--accent-orange)" : "var(--accent-mint)",
              background: delta.good === false ? "rgba(255,177,94,0.12)" : "rgba(77,227,160,0.12)",
            }}
          >
            <Icon name={delta.dir === "up" ? "ArrowUp" : "ArrowDown"} size={12} />
            {delta.text}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
          {toneLabel && (
            <div className="mt-0.5 text-sm font-medium" style={{ color: toneColor }}>
              {toneLabel}
            </div>
          )}
        </div>
        {spark && (
          <div className="shrink-0 opacity-90">
            <Sparkline data={spark.data} color={spark.color ?? toneColor} width={104} height={40} />
          </div>
        )}
      </div>

      {typeof progress === "number" && (
        <div className={cn("mt-4 h-2 overflow-hidden rounded-full bg-card-hover")}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent}, var(--accent-blue))` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      )}
    </motion.div>
  );
}

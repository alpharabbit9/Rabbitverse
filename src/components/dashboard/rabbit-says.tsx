"use client";

import { motion } from "motion/react";
import { Icon } from "@/components/icon";
import { Rabbit } from "@/components/mascot/rabbit";
import type { Insight } from "@/lib/motivation";

export function RabbitSays({ insights }: { insights: Insight[] }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-card-hover">
          <Icon name="Sparkles" size={15} style={{ color: "var(--accent-purple)" }} />
        </span>
        <h3 className="font-semibold">Rabbit says</h3>
      </div>
      <ul className="space-y-2.5 pr-20 sm:pr-28">
        {insights.map((ins, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="flex items-start gap-2.5 text-sm text-fg-secondary"
          >
            <Icon name={ins.icon} size={16} style={{ color: ins.tone, marginTop: 2 }} />
            <span>{ins.text}</span>
          </motion.li>
        ))}
      </ul>
      <div className="pointer-events-none absolute -bottom-2 right-1 opacity-90">
        <Rabbit state="walking" size={96} glow />
      </div>
    </div>
  );
}

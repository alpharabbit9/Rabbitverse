"use client";

import { motion } from "motion/react";
import { greeting } from "@/lib/dates";
import { Icon } from "@/components/icon";
import { Rabbit, type RabbitState } from "@/components/mascot/rabbit";
import { MOOD_EMOJI, MOOD_LABEL } from "@/lib/motivation";
import type { MoodState } from "@/lib/types";

export function PageHeader({
  name,
  subtitle,
  streakDays,
  level,
  mood,
  rabbitState,
}: {
  name: string;
  subtitle: string;
  streakDays: number;
  level: number;
  mood: MoodState;
  rabbitState: RabbitState;
}) {
  const g = greeting();

  return (
    <div className="relative flex items-start justify-between gap-4">
      <div className="min-w-0">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold tracking-tight sm:text-[32px] sm:leading-[1.1]"
          suppressHydrationWarning
        >
          {g.text}, {name} <span className="align-middle">{g.emoji}</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-1 text-sm text-fg-secondary sm:text-base"
        >
          {subtitle}
        </motion.p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
            <Icon name="Flame" size={15} style={{ color: "var(--accent-orange)" }} />
            <span className="font-semibold">{streakDays}</span>
            <span className="text-xs text-fg-muted">day streak</span>
          </span>
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
            <Icon name="Star" size={15} style={{ color: "var(--accent-gold)" }} />
            <span className="text-fg-secondary">Rabbit Lv</span>
            <span className="font-semibold">{level}</span>
          </span>
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
            <span className="text-xs text-fg-muted">Mood:</span>
            <span className="font-medium">{MOOD_LABEL[mood]}</span>
            <span>{MOOD_EMOJI[mood]}</span>
          </span>
        </div>
      </div>

      <div className="relative hidden shrink-0 sm:block">
        <Rabbit state={rabbitState} size={132} />
      </div>
    </div>
  );
}

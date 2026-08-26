"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { MASCOTS, MASCOT_ORDER } from "@/components/mascot/registry";
import { resolveMascot, type MascotSpecies } from "@/components/mascot/types";
import { cn } from "@/lib/utils";
import { saveMascot } from "@/app/(app)/settings/actions";

/*
  Settings → Mascot. Six tiles, each drawing its own creature live in the
  `walking` pose so the choice is made on the animation, not on a still.

  Saves on tap — no confirm button to forget — and rolls the selection back if
  the write fails, the same shape `LocaleCard` uses. The header and the
  "<Mascot> says" card follow on the next render, because `saveMascot`
  revalidates every route under the (app) layout that seeds the provider.
*/

export function MascotCard({ initial }: { initial: string }) {
  const [picked, setPicked] = useState<MascotSpecies>(() => resolveMascot(initial));
  const [pending, startTransition] = useTransition();

  const choose = (species: MascotSpecies) => {
    if (species === picked || pending) return;
    const prev = picked;
    setPicked(species);
    startTransition(async () => {
      const res = await saveMascot(species);
      if (res.ok) {
        toast.success(`${MASCOTS[species].name} it is ✓`);
      } else {
        setPicked(prev);
        toast.error(res.error ?? "Could not save that.");
      }
    });
  };

  return (
    <div className={cn(pending && "opacity-70")}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MASCOT_ORDER.map((species) => {
          const { name, Component, copy } = MASCOTS[species];
          const active = species === picked;
          return (
            <button
              key={species}
              type="button"
              onClick={() => choose(species)}
              disabled={pending}
              aria-pressed={active}
              className={cn(
                "group relative flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-colors",
                active
                  ? "border-[var(--accent-purple)] bg-card-hover"
                  : "border-border hover:border-border-strong hover:bg-card-hover/60",
              )}
            >
              {active && (
                <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[var(--accent-purple)]">
                  <Icon name="Check" size={13} style={{ color: "#fff" }} />
                </span>
              )}
              <Component state="walking" size={84} glow={active} />
              <span className="text-sm font-semibold">{name}</span>
              <span className="text-[11px] leading-snug text-fg-muted">{copy.walking}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-fg-muted">
        {`Your mascot appears in the header and on the "${MASCOTS[picked].name} says" card, and changes pose with your day — asleep with nothing logged, celebrating on a near-perfect one.`}
      </p>
    </div>
  );
}

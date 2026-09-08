/*
  The one surface every block on the Project Details page is built on.

  Default is the app's plain `.glass` card. The tinted variants add a *restrained*
  accent — a faintly coloured border and a soft wash from the top — driven by a
  single token so light and dark both stay correct (the accents are different
  hexes per theme). No glow, no heavy gradient: the design brief asks for depth
  from layering, not decoration.
*/

import type { ComponentProps } from "react";
import { tint } from "../card/status";
import { cn } from "@/lib/utils";

export type SectionCardVariant = "default" | "purple" | "green" | "red" | "blue";

const ACCENT: Record<Exclude<SectionCardVariant, "default">, string> = {
  purple: "var(--accent-purple)",
  green: "var(--accent-mint)",
  red: "var(--accent-rose)",
  blue: "var(--accent-blue)",
};

export function SectionCard({
  variant = "default",
  className,
  style,
  children,
  ...props
}: ComponentProps<"div"> & { variant?: SectionCardVariant }) {
  const accent = variant === "default" ? null : ACCENT[variant];

  return (
    <div
      className={cn(
        "glass rounded-2xl transition-colors duration-300",
        // Only the tinted variants get a coloured hairline; default keeps the
        // neutral border but still lifts a touch on hover.
        accent ? "hover:border-[color:var(--sc-accent)]" : "hover:border-border-strong",
        className,
      )}
      style={
        accent
          ? {
              // `--sc-accent` is read by the hover border above and the wash below.
              ["--sc-accent" as string]: tint(accent, 34),
              borderColor: tint(accent, 22),
              backgroundImage: `radial-gradient(130% 90% at 50% 0%, ${tint(accent, 12)}, transparent 60%)`,
              ...style,
            }
          : style
      }
      {...props}
    >
      {children}
    </div>
  );
}

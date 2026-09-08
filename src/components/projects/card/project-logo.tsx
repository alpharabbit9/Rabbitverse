"use client";

/*
  The logo well.

  A plain <img>, not next/image: project logos are arbitrary Supabase Storage
  URLs, and `next/image` would need a `remotePatterns` entry per bucket host it
  can never have ahead of time. The rest of the app makes the same call (see
  `create/logo-uploader.tsx`).

  Three states, in order: the image; the project's monogram when there is no
  logo *or the logo fails to load*; a generic icon when even the name is empty.
  The failed-load case is tracked by URL rather than by a boolean so that
  swapping in a new logo re-arms it without an effect.
*/

import { useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/** Two letters at most — "Rabbit Verse" is RV, "Rabbitverse" is RA. */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

export function ProjectLogo({
  src,
  name,
  className,
  fit = "float",
}: {
  src?: string;
  name: string;
  className?: string;
  /**
   * How an uploaded image sits in the well. "float" (default) insets it and
   * lets the accent well frame it — the grid card's branded look. "cover" fills
   * the well edge-to-edge, so a logo with its own padding reaches every corner
   * instead of leaving a wide margin.
   */
  fit?: "float" | "cover";
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const initials = monogram(name);
  const showImage = Boolean(src) && failed !== src;

  return (
    <div
      className={cn(
        "rv-pcard-logo relative grid shrink-0 place-items-center overflow-hidden rounded-[1.5rem] @5xl/pcard:rounded-[2rem]",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} logo`}
          onError={() => setFailed(src ?? null)}
          className={cn(
            fit === "cover"
              ? "size-full object-cover"
              : "size-[72%] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]",
          )}
        />
      ) : initials ? (
        <span
          aria-hidden
          className="heading-display bg-gradient-to-br from-fg to-[var(--pc-accent)] bg-clip-text text-2xl font-bold text-transparent @lg/pcard:text-4xl @5xl/pcard:text-6xl"
        >
          {initials}
        </span>
      ) : (
        <Icon name="FolderKanban" className="size-8 text-fg-muted @lg/pcard:size-12 @5xl/pcard:size-20" strokeWidth={1.5} />
      )}
    </div>
  );
}

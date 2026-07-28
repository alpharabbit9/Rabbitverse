"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The app's profile image. Uses the signed-in Google account's picture when
 * available, falling back to a gradient monogram (also used in demo mode and if
 * the remote image fails to load).
 */
export function ProfileAvatar({
  name,
  avatarUrl,
  size = 40,
  className,
}: {
  name: string;
  avatarUrl: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const dim = { width: size, height: size };

  if (avatarUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        style={dim}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-white/10", className)}
      />
    );
  }

  return (
    <div
      style={dim}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-purple to-accent-blue font-bold text-white",
        className,
      )}
    >
      <span style={{ fontSize: size * 0.42 }}>{(name[0] ?? "R").toUpperCase()}</span>
    </div>
  );
}

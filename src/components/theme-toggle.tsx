"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Icon } from "./icon";

/** The theme is only known on the client, so the icon waits for hydration. */
const neverChanges = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // "Have we hydrated yet?" as an external store — the useState + useEffect
  // version of this guard sets state directly inside an effect.
  const mounted = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={
        "grid size-9 place-items-center rounded-xl border border-border bg-card text-fg-secondary transition-colors hover:text-fg hover:border-border-strong " +
        (className ?? "")
      }
    >
      {mounted ? <Icon name={isDark ? "Sun" : "Moon"} size={17} /> : <span className="size-[17px]" />}
    </button>
  );
}

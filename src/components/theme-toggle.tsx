"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Icon } from "./icon";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_RANGE, RANGE_KEYS, isRangeKey, type RangeKey } from "@/lib/range";

/*
  The 7d · 30d · 90d · 1y toggle every trend panel shares.

  The choice is remembered in localStorage so it survives a reload and follows
  the user between sections — switching to 90d on Expenses and walking over to
  Workout should not silently snap back to 30d.

  It is a real module store rather than component state, for two reasons: every
  toggle on a page moves together, and the server has no localStorage, so the
  HTML is always rendered at the default and the saved value can only arrive
  after hydration. `subscribe` announces that difference the moment React
  subscribes, rather than trusting the post-hydration snapshot re-check alone.

  Slicing lives in `lib/range.ts` (pure, tested); this file is only the control.
*/

const STORAGE_KEY = "rv-range";

const listeners = new Set<() => void>();
/** Cached so `getSnapshot` is stable between notifications, as React requires. */
let cached: RangeKey | null = null;

function readStored(): RangeKey {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isRangeKey(v)) return v;
  } catch {}
  return DEFAULT_RANGE;
}

function getSnapshot(): RangeKey {
  if (cached === null) cached = readStored();
  return cached;
}

function emit() {
  for (const listener of listeners) listener();
}

/** Another tab changed the range — `storage` only fires in the *other* tabs. */
function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  cached = readStored();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  if (getSnapshot() !== DEFAULT_RANGE) listener();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useRange(): [RangeKey, (r: RangeKey) => void] {
  const range = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_RANGE);

  const setRange = useCallback((next: RangeKey) => {
    cached = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    emit();
  }, []);

  return [range, setRange];
}

export function RangeToggle({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card-hover/40 p-0.5" role="group" aria-label="Time range">
      {RANGE_KEYS.map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === key ? "bg-card-solid text-fg shadow-sm" : "text-fg-muted hover:text-fg-secondary"
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

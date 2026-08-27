"use client";

/*
  Optimistic, undoable delete for Phase F's row lists.

  Calling `remove(id)` hides the row immediately and shows a sonner toast with
  Undo. The real server delete only fires after a short grace window, so Undo
  simply cancels the pending timer — there is nothing to restore and no
  today/yesterday window to fight (unlike re-inserting a deleted row would).
  If the grace elapses, the server action runs; on failure the row is un-hidden
  and the error surfaced.

  Returns the set of hidden ids so the list can filter them out while pending.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type CommitResult = { ok: boolean; error: string | null };

const GRACE_MS = 5000;

export function useUndoableDelete(
  commit: (id: string) => Promise<CommitResult>,
  opts?: { label?: string; graceMs?: number },
) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const graceMs = opts?.graceMs ?? GRACE_MS;
  const label = opts?.label ?? "Deleted";

  const unhide = useCallback((id: string) => {
    setHidden((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const remove = useCallback(
    (id: string) => {
      if (timers.current.has(id)) return; // already pending
      setHidden((prev) => new Set(prev).add(id));

      const timer = setTimeout(async () => {
        timers.current.delete(id);
        const res = await commit(id);
        if (!res.ok) {
          unhide(id);
          toast.error(res.error ?? "Couldn't delete that.");
        }
      }, graceMs);
      timers.current.set(id, timer);

      toast(label, {
        duration: graceMs,
        action: {
          label: "Undo",
          onClick: () => {
            const t = timers.current.get(id);
            if (t) clearTimeout(t);
            timers.current.delete(id);
            unhide(id);
          },
        },
      });
    },
    [commit, graceMs, label, unhide],
  );

  // Cancel any pending deletes if the list unmounts (e.g. navigation) — nothing
  // is destroyed unless the grace fully elapses while mounted, which is the safe
  // default.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  return { hidden, remove };
}

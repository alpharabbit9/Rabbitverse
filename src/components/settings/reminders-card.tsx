"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { deletePushSubscription, savePushSubscription, saveReminderTime } from "@/app/(app)/settings/actions";

/**
 * Daily-reminder controls: an on/off push toggle (subscribes this device and
 * stores the subscription) plus the Dhaka-local reminder time. The actual push
 * is sent server-side by the send-reminders Edge Function at this time.
 */
export function RemindersCard({ initialTime }: { initialTime: string }) {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [time, setTime] = useState(initialTime);
  const [savingTime, setSavingTime] = useState(false);

  useEffect(() => {
    let alive = true;
    // Reflect the current subscription state (async — no synchronous setState in
    // the effect body). getExistingSubscription() already returns null when the
    // browser can't do push.
    getExistingSubscription()
      .then((s) => {
        if (alive) setEnabled(!!s);
      })
      .catch(() => {});
    const id = isPushSupported() ? null : setTimeout(() => alive && setSupported(false), 0);
    return () => {
      alive = false;
      if (id) clearTimeout(id);
    };
  }, []);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!enabled) {
        const sub = await subscribeToPush();
        const res = await savePushSubscription(sub);
        if (!res.ok) throw new Error(res.error ?? "Could not save subscription.");
        setEnabled(true);
        toast.success("Reminders on ✓");
      } else {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await deletePushSubscription(endpoint);
        setEnabled(false);
        toast.success("Reminders off");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onTimeBlur = async () => {
    if (time === initialTime || savingTime) return;
    setSavingTime(true);
    const res = await saveReminderTime(time);
    setSavingTime(false);
    if (res.ok) toast.success("Reminder time saved ✓");
    else {
      toast.error(res.error ?? "Could not save time.");
      setTime(initialTime);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-orange/15">
            <Icon name="Bell" size={18} style={{ color: "var(--accent-orange)" }} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium">Daily reminder</div>
            <div className="truncate text-xs text-fg-muted">
              {supported ? "A nudge to log your day on this device" : "Not supported on this browser"}
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle daily reminder"
          onClick={toggle}
          disabled={!supported || busy}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
            enabled ? "bg-accent-orange" : "bg-border-strong",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      <label className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-fg-secondary">Remind me at</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onBlur={onTimeBlur}
          className="rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-sm outline-none focus:border-border-strong"
        />
      </label>
      <p className="text-xs text-fg-muted">
        Sent at {time} Asia/Dhaka. Enable it once per device you want reminders on.
      </p>
    </div>
  );
}

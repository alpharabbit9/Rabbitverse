"use client";

/*
  The door, as three radio buttons.

  Switching to `closed` or `invite` is confirmed; switching back to `open` is
  not. The asymmetry is on purpose — opening the door is the state the app has
  been in its whole life and is instantly reversible, while closing it is the
  change somebody might make by mis-clicking and then not notice for a week,
  because nothing about *their* signed-in experience changes.
*/

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SIGNUP_MODES, SIGNUP_MODE_COPY } from "@/lib/admin/roles";
import type { SignupMode } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { setSignupMode } from "../actions";

const MODE_ICON: Record<SignupMode, string> = {
  open: "Globe",
  invite: "Ticket",
  closed: "ShieldCheck",
};

const MODE_ACCENT: Record<SignupMode, string> = {
  open: "var(--accent-cyan)",
  invite: "var(--accent-gold)",
  closed: "var(--accent-rose)",
};

/** What actually changes for the people who are not you. */
const CONSEQUENCE: Record<SignupMode, string> = {
  open: "Anybody who finds the link can create an account, with an email address or with Google.",
  invite:
    "A live code or an invited address is required. Existing accounts are untouched, and Google sign-in keeps working for everyone who already has one.",
  closed:
    "Nobody new gets in — invites included. Everyone who already has an account signs in exactly as before.",
};

export function SignupModeCard({ current, canWrite }: { current: SignupMode; canWrite: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<SignupMode | null>(null);

  const apply = (next: SignupMode) =>
    startTransition(async () => {
      const res = await setSignupMode(next);
      if (!res.ok) {
        toast.error(res.error ?? "That didn't work.");
        return;
      }
      setConfirming(null);
      toast.success(`Sign-ups are now ${SIGNUP_MODE_COPY[next].label.toLowerCase()}.`);
      router.refresh();
    });

  const choose = (next: SignupMode) => {
    if (next === current) return;
    // Opening up is instantly reversible; the two restrictive modes are the ones
    // worth a second look.
    if (next === "open") apply(next);
    else setConfirming(next);
  };

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">Sign-ups</h2>
      <p className="mt-1 text-xs text-fg-secondary">
        Takes effect immediately, on every path in — the form, the API and Google alike.
      </p>

      <div role="radiogroup" aria-label="Signup mode" className="mt-4 grid gap-2.5 lg:grid-cols-3">
        {SIGNUP_MODES.map((mode) => {
          const active = mode === current;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!canWrite || pending}
              title={!canWrite ? "Not available without a service-role key." : undefined}
              onClick={() => choose(mode)}
              className={cn(
                "rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-border-strong bg-card-hover"
                  : "border-border hover:border-border-strong hover:bg-card-hover/50",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon name={MODE_ICON[mode]} size={16} style={{ color: MODE_ACCENT[mode] }} />
                <span className="text-sm font-medium">{SIGNUP_MODE_COPY[mode].label}</span>
                {active && (
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-fg-muted">
                    <Icon name="Check" size={12} /> current
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-secondary">{SIGNUP_MODE_COPY[mode].description}</p>
            </button>
          );
        })}
      </div>

      {!canWrite && (
        <p className="mt-3 text-xs text-fg-muted">
          `SUPABASE_SERVICE_ROLE_KEY` is not set on this deployment, so the mode cannot be changed from here.
        </p>
      )}

      <ConfirmDialog
        open={confirming !== null}
        tone={confirming === "closed" ? "danger" : "default"}
        title={confirming === "closed" ? "Close sign-ups?" : "Make sign-ups invite-only?"}
        description={confirming ? CONSEQUENCE[confirming] : ""}
        confirmLabel={confirming === "closed" ? "Close the door" : "Require an invite"}
        pending={pending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && apply(confirming)}
      />
    </section>
  );
}

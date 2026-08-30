"use client";

/*
  A modal confirmation, for the handful of actions the app's usual two-tap
  `RowMenu` pattern is too light for.

  `RowMenu` asks for a second tap on the same button; that is right for deleting
  one expense and wrong for suspending a person's account. This stops you, names
  what is about to happen, and — when `requireText` is set — will not enable its
  own button until you have typed the thing back.

  The body is a separate component that only mounts while the dialog is open, so
  the typed confirmation resets by unmounting rather than by an effect writing
  state. A previous attempt can never pre-arm the next one.
*/

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  /** When set, the confirm button stays disabled until this is typed back (case-insensitive). */
  requireText?: string;
  requireHint?: string;
  pending?: boolean;
  /**
   * Receives whatever was typed into the `requireText` box, so the caller can
   * send it to the server and have the confirmation re-checked there. The
   * comparison below is trim + case-fold — the same semantics as
   * `confirmationMatches()` in `lib/admin/guards.ts`, which is the one that
   * actually decides.
   */
  onConfirm: (typed: string) => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({ open, ...rest }: ConfirmDialogProps) {
  if (!open) return null;
  return <Dialog {...rest} />;
}

function Dialog({
  title,
  description,
  confirmLabel,
  tone = "default",
  requireText,
  requireHint,
  pending = false,
  onConfirm,
  onCancel,
  children,
}: Omit<ConfirmDialogProps, "open">) {
  const [typed, setTyped] = useState("");
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const satisfied = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase();
  const danger = tone === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-strong relative w-full max-w-md rounded-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl"
            style={{
              backgroundColor: danger ? "color-mix(in srgb, var(--accent-rose) 14%, transparent)" : "var(--card-hover)",
            }}
          >
            <Icon
              name={danger ? "TriangleAlert" : "ShieldCheck"}
              size={17}
              style={{ color: danger ? "var(--accent-rose)" : "var(--accent-gold)" }}
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-semibold">
              {title}
            </h2>
            <div className="mt-1 text-sm text-fg-secondary">{description}</div>
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        {requireText && (
          <label className="mt-4 block">
            <span className="text-xs text-fg-muted">{requireHint ?? `Type ${requireText} to confirm`}</span>
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-sm outline-none transition-colors hover:border-border-strong focus:border-border-strong"
            />
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2 text-sm text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!satisfied || pending}
            onClick={() => onConfirm(typed)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-40",
              danger ? "bg-accent-rose text-black" : "bg-fg text-bg",
            )}
          >
            {pending && <Icon name="Loader" size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

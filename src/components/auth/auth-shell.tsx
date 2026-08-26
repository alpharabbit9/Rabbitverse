"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

/*
  The chrome every auth screen shares — drifting aurora, the logo mark, the
  wordmark, and a glass card for whatever form the page is showing. Extracted
  from the original login screen so /signup, /forgot-password and /auth/reset
  look like the same product rather than three bolted-on forms.

  `logo-mark.png` is brand, not mascot: the mascot layer (Phase C) is separate
  and deliberately leaves this alone.
*/

export const authInputCls =
  "w-full rounded-xl border border-border bg-card-hover/60 px-3.5 py-2.5 text-sm text-fg " +
  "placeholder:text-fg-muted transition-colors focus:border-border-strong focus:outline-none " +
  "disabled:opacity-60";

export function AuthShell({
  tagline,
  message,
  error,
  children,
  footer,
}: {
  /** Rotating phrases (login) or a single fixed line. */
  tagline?: React.ReactNode;
  /** A success/info note, shown above the card. */
  message?: string | null;
  error?: string | null;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden p-6">
      <AuroraOrbs />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-sm text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.05, ease: "easeOut" }}
          className="relative mx-auto grid size-24 place-items-center"
        >
          <span className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-accent-purple/50 to-accent-blue/40 blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mark.png"
            alt="Rabbit Verse"
            className="animate-float relative size-24 rounded-[26px] object-cover ring-1 ring-white/15 shadow-[0_20px_50px_-12px_rgba(139,92,246,0.55)]"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="font-display mt-6 bg-gradient-to-r from-fg via-fg to-accent-purple bg-clip-text text-4xl font-semibold tracking-tight text-transparent"
        >
          Rabbit Verse
        </motion.h1>

        {tagline ? (
          <p className="mx-auto mt-2 flex min-h-[2.75rem] max-w-[19rem] items-start justify-center text-sm text-fg-secondary">
            {tagline}
          </p>
        ) : null}

        {error ? <Banner tone="var(--accent-orange)" bg="rgba(255,177,94,0.08)" text={error} /> : null}
        {message ? <Banner tone="var(--accent-mint)" bg="rgba(110,231,183,0.08)" text={message} /> : null}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="glass-strong mt-7 rounded-3xl p-6 text-left"
        >
          {children}
        </motion.div>

        {footer ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-6 text-xs text-fg-muted"
          >
            {footer}
          </motion.div>
        ) : null}
      </motion.div>
    </main>
  );
}

function Banner({ tone, bg, text }: { tone: string; bg: string; text: string }) {
  return (
    <div
      role="status"
      className="mt-6 rounded-xl border border-border px-4 py-3 text-sm"
      style={{ color: tone, background: bg }}
    >
      {text}
    </div>
  );
}

/** Three drifting, blurred accent orbs behind the card — the "lively" backdrop. */
export function AuroraOrbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="animate-orb absolute -left-16 top-10 size-64 rounded-full bg-accent-purple/25 blur-3xl" />
      <span className="animate-orb absolute -right-16 top-1/3 size-72 rounded-full bg-accent-blue/20 blur-3xl [animation-delay:-4s]" />
      <span className="animate-orb absolute bottom-0 left-1/4 size-64 rounded-full bg-accent-cyan/15 blur-3xl [animation-delay:-8s]" />
    </div>
  );
}

/** Types the phrases out one character at a time, then deletes and moves on. */
export function Typewriter({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const current = phrases[index % phrases.length];

    // Reduced motion: settle on the full first phrase (scheduled, never synchronous).
    if (reduce) {
      const t = setTimeout(() => setText(phrases[0]), 0);
      return () => clearTimeout(t);
    }

    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && text === current) {
      timeout = setTimeout(() => setDeleting(true), 1600); // pause on a completed phrase
    } else if (deleting && text === "") {
      timeout = setTimeout(() => {
        setDeleting(false);
        setIndex((v) => (v + 1) % phrases.length);
      }, 400); // brief beat before the next phrase
    } else {
      timeout = setTimeout(
        () => setText((t) => (deleting ? current.slice(0, t.length - 1) : current.slice(0, t.length + 1))),
        deleting ? 32 : 55,
      );
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, index, phrases]);

  return (
    <span className="text-balance">
      {text}
      <span className="rv-caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] rounded-full bg-accent-purple align-middle" />
    </span>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="relative">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

/** The gradient primary button every auth form submits with. */
export function AuthSubmit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue px-4 py-3 font-medium text-white shadow-[0_10px_28px_-8px_rgba(139,92,246,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative">{pending ? "One moment…" : children}</span>
    </button>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Icon } from "@/components/icon";
import {
  AuthShell,
  AuthSubmit,
  GoogleIcon,
  Typewriter,
  authInputCls,
} from "@/components/auth/auth-shell";
import type { AuthResult } from "@/app/auth/actions";

const PHRASES = [
  "See your life. Not just live it.",
  "Every green day is a day you showed up.",
  "Projects, body, money, and mind — in one place.",
  "Small streaks. Big changes.",
];

const INITIAL: AuthResult = { ok: false, error: null, message: null };

export function LoginExperience({
  configured,
  message,
  signIn,
  signInWithPassword,
}: {
  configured: boolean;
  message: string | null;
  signIn: () => Promise<void>;
  signInWithPassword: (prev: AuthResult, fd: FormData) => Promise<AuthResult>;
}) {
  const [state, formAction, pending] = useActionState(signInWithPassword, INITIAL);

  return (
    <AuthShell
      tagline={<Typewriter phrases={PHRASES} />}
      error={message ?? state.error}
      footer={
        configured ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-fg-secondary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        ) : null
      }
    >
      {configured ? (
        <div className="space-y-5">
          <form action={formAction} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-fg-secondary">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={pending}
                placeholder="you@example.com"
                className={authInputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-fg-secondary">
                Password
                <Link href="/forgot-password" className="text-fg-muted underline-offset-4 hover:underline">
                  Forgot?
                </Link>
              </span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={pending}
                placeholder="••••••••"
                className={authInputCls}
              />
            </label>
            <AuthSubmit pending={pending}>Sign in</AuthSubmit>
          </form>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-fg-muted">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={signIn}>
            <button
              type="submit"
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-white px-4 py-3 font-medium text-[#1f1f1f] shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-fg-secondary">
            Supabase isn&apos;t configured yet, so Rabbit Verse is running in <strong>demo mode</strong> on sample data.
          </p>
          <Link
            href="/"
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue px-4 py-3 font-medium text-white shadow-[0_10px_28px_-8px_rgba(139,92,246,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Icon name="Sparkles" size={16} className="relative" />
            <span className="relative">Explore the demo</span>
          </Link>
          <p className="text-xs text-fg-muted">Add your keys (see SUPABASE_SETUP.md) to enable sign-in.</p>
        </div>
      )}
    </AuthShell>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell, AuthSubmit, GoogleIcon, authInputCls } from "@/components/auth/auth-shell";
import type { AuthResult } from "@/app/auth/actions";

const INITIAL: AuthResult = { ok: false, error: null, message: null };

export function SignUpForm({
  signUp,
  signInWithGoogle,
}: {
  signUp: (prev: AuthResult, fd: FormData) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(signUp, INITIAL);

  return (
    <AuthShell
      tagline="Start seeing your life, not just living it."
      error={state.error}
      message={state.message}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-fg-secondary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {/* Once the confirmation mail is away there is nothing left to fill in,
          so the form is replaced by the note rather than sitting there inviting
          a second submission. */}
      {state.message ? (
        <p className="text-center text-sm text-fg-secondary">
          Open the link on this device and you&apos;ll land straight in your dashboard.
        </p>
      ) : (
        <div className="space-y-5">
          <form action={formAction} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-fg-secondary">Name</span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                maxLength={60}
                disabled={pending}
                placeholder="What should Rabbit call you?"
                className={authInputCls}
              />
            </label>
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
              <span className="mb-1.5 block text-xs font-medium text-fg-secondary">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={pending}
                placeholder="At least 8 characters"
                className={authInputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-fg-secondary">Confirm password</span>
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={pending}
                placeholder="Once more"
                className={authInputCls}
              />
            </label>
            <AuthSubmit pending={pending}>Create account</AuthSubmit>
          </form>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-fg-muted">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-white px-4 py-3 font-medium text-[#1f1f1f] shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <GoogleIcon />
              Sign up with Google
            </button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}

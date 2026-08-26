"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell, AuthSubmit, authInputCls } from "@/components/auth/auth-shell";
import type { AuthResult } from "@/app/auth/actions";

const INITIAL: AuthResult = { ok: false, error: null, message: null };

/** "Email me a reset link." Never says whether the address has an account. */
export function ForgotPasswordForm({
  requestReset,
}: {
  requestReset: (prev: AuthResult, fd: FormData) => Promise<AuthResult>;
}) {
  const [state, formAction, pending] = useActionState(requestReset, INITIAL);

  return (
    <AuthShell
      tagline="Locked out? We'll send you a way back in."
      error={state.error}
      message={state.message}
      footer={
        <Link href="/login" className="font-medium text-fg-secondary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {state.message ? (
        <p className="text-center text-sm text-fg-secondary">
          The link is good for a short while — open it on this device.
        </p>
      ) : (
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
          <AuthSubmit pending={pending}>Send reset link</AuthSubmit>
        </form>
      )}
    </AuthShell>
  );
}

/** Set a new password, using the session the emailed link established. */
export function ResetPasswordForm({
  updatePassword,
  ready,
}: {
  updatePassword: (prev: AuthResult, fd: FormData) => Promise<AuthResult>;
  /** False when the visitor arrived without a valid recovery session. */
  ready: boolean;
}) {
  const [state, formAction, pending] = useActionState(updatePassword, INITIAL);

  return (
    <AuthShell
      tagline="Pick something you'll remember."
      error={state.error}
      footer={
        <Link href="/login" className="font-medium text-fg-secondary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {ready ? (
        <form action={formAction} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-fg-secondary">New password</span>
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
          <AuthSubmit pending={pending}>Save password</AuthSubmit>
        </form>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-fg-secondary">
            This reset link has expired or was already used.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
          >
            Send a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}

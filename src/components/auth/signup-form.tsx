"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AuthShell, AuthSubmit, GoogleIcon, authInputCls } from "@/components/auth/auth-shell";
import { isInviteCodeShape, normalizeInviteCode } from "@/lib/admin/invites";
import type { SignupMode } from "@/lib/admin/types";
import type { AuthResult } from "@/app/auth/actions";

/*
  The signup form, in its open and invite-only shapes.

  The invite field is required by the browser and by the server, and neither is
  the real gate — `handle_new_user()` consumes the code inside the signup
  transaction and refuses if it cannot. Everything here is about giving somebody
  a readable reason before they wait for a round trip.

  THE GOOGLE BUTTON STAYS IN INVITE MODE. There is nowhere to type a code on a
  consent screen, so an invited Google user has to be invited by address — and
  the line under the button says exactly that instead of leaving them to press it
  and be bounced by the callback.
*/

const INITIAL: AuthResult = { ok: false, error: null, message: null };

export function SignUpForm({
  mode = "open",
  invite = "",
  notice = null,
  signUp,
  signInWithGoogle,
}: {
  mode?: SignupMode;
  /** Prefilled from `/signup?invite=CODE`, already normalised. */
  invite?: string;
  /** A refusal carried back from the OAuth callback. */
  notice?: string | null;
  signUp: (prev: AuthResult, fd: FormData) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(signUp, INITIAL);
  const [code, setCode] = useState(invite);

  const inviteOnly = mode === "invite";
  // Only complain once they have typed something that is clearly not a code —
  // an empty field is handled by `required`, and a half-typed one is not an error yet.
  const malformed = inviteOnly && code.trim().length >= 12 && !isInviteCodeShape(normalizeInviteCode(code));

  return (
    <AuthShell
      tagline="Start seeing your life, not just living it."
      error={state.error ?? notice}
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
            {inviteOnly && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-fg-secondary">Invite code</span>
                <input
                  name="invite_code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onBlur={() => setCode((c) => (c.trim() ? normalizeInviteCode(c) : c))}
                  required
                  disabled={pending}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={32}
                  placeholder="RV-XXXX-XXXX"
                  aria-invalid={malformed || undefined}
                  className={`${authInputCls} font-mono tracking-wider uppercase placeholder:font-sans placeholder:normal-case placeholder:tracking-normal`}
                />
                <span className="mt-1 block text-[11px] text-fg-muted">
                  {malformed
                    ? "That doesn't look like a Rabbit Verse code — check it against the one you were sent."
                    : "Case and dashes don't matter."}
                </span>
              </label>
            )}
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

          <form action={signInWithGoogle} className="space-y-2">
            <button
              type="submit"
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-white px-4 py-3 font-medium text-[#1f1f1f] shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <GoogleIcon />
              Sign up with Google
            </button>
            {inviteOnly && (
              <p className="text-center text-[11px] leading-relaxed text-fg-muted">
                Google sign-in works once your email address has been invited — a code can only be typed on the form
                above.
              </p>
            )}
          </form>
        </div>
      )}
    </AuthShell>
  );
}

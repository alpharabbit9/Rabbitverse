import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

/*
  What /signup is when the door is shut.

  No form and no Google button — not disabled ones, none at all. A greyed-out
  field invites people to try it and then feel refused; an absent field just says
  there is nothing to fill in. The sign-in link stays, prominently, because the
  most likely visitor to this page is somebody who already has an account and
  followed the wrong link.
*/

export function SignupClosed({ notice }: { notice?: string | null }) {
  return (
    <AuthShell
      tagline="Rabbit Verse isn't taking new sign-ups right now."
      error={notice ?? null}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-fg-secondary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-3 text-center">
        <p className="text-sm text-fg-secondary">
          The door is closed for now. Nothing has changed for anyone who already has an account — your data is where
          you left it and sign-in works as normal.
        </p>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue px-4 py-3 font-medium text-white shadow-[0_10px_28px_-8px_rgba(139,92,246,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          Go to sign in
        </Link>
      </div>
    </AuthShell>
  );
}

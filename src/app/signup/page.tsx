import { redirect } from "next/navigation";
import { signInWithGoogle, signUpWithPassword } from "@/app/auth/actions";
import { SignupClosed } from "@/components/auth/signup-closed";
import { SignUpForm } from "@/components/auth/signup-form";
import { normalizeInviteCode } from "@/lib/admin/invites";
import { getSignupMode } from "@/lib/data/signup";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/*
  /signup, in three states.

  What renders here is a courtesy, not a control. `handle_new_user()` enforces
  the mode inside the signup transaction (`0008_invites.sql`) and
  `signUpWithPassword` re-reads it server-side before it calls Supabase — so a
  page cached from when sign-ups were open cannot let anybody in.

  `?blocked=` arrives from `/auth/callback` when Google created an account the
  trigger then refused. There is no way to catch that earlier: OAuth writes
  `auth.users` before any of our code runs.
*/

interface PageProps {
  // Next 16: searchParams is a Promise.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

const BLOCKED_COPY: Record<string, string> = {
  closed:
    "We couldn't create an account for that Google address — Rabbit Verse isn't taking new sign-ups right now.",
  invite:
    "We couldn't create an account for that Google address — Rabbit Verse is invite-only right now. If you were invited, use the address the invite was sent to.",
  open: "We couldn't create an account for that Google address. Try again, or sign in if you already have one.",
};

/** There is nothing to sign up *to* without a database, so demo mode sends you home. */
export default async function SignUpPage({ searchParams }: PageProps) {
  if (!isSupabaseConfigured) redirect("/login");

  // `searchParams` first, on purpose: awaiting it is what tells Next this render
  // is per-request, so the build never reaches the query below looking for an
  // answer it could bake in.
  const sp = await searchParams;
  const mode = await getSignupMode();

  // The banner reflects the mode as it is NOW, not as it was when the callback
  // bounced — an owner who reopened sign-ups in between shouldn't leave somebody
  // reading a stale refusal.
  const blocked = one(sp.blocked);
  const notice = blocked ? (BLOCKED_COPY[mode] ?? BLOCKED_COPY.open) : null;

  if (mode === "closed") return <SignupClosed notice={notice} />;

  const invite = one(sp.invite).slice(0, 32);

  return (
    <SignUpForm
      mode={mode}
      invite={invite ? normalizeInviteCode(invite) : ""}
      notice={notice}
      signUp={signUpWithPassword}
      signInWithGoogle={signInWithGoogle}
    />
  );
}

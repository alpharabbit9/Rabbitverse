import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";

/**
 * Where a suspended account lands. `public.users.status` is service-role-only
 * (migration 0004 gives the roster a select-own policy and nothing else), so a
 * user cannot lift this themselves — which is the whole point of it.
 */
export default function SuspendedPage() {
  return (
    <AuthShell tagline="This account is on hold.">
      <div className="space-y-4 text-center">
        <p className="text-sm text-fg-secondary">
          Your Rabbit Verse account has been suspended, so it can&apos;t be signed into right now. Your
          data is untouched.
        </p>
        {/* Signing out here rather than just linking away: a suspended account
            that arrived mid-session still holds a valid session cookie, and
            leaving it live would be an odd half-state. */}
        <form action={signOut}>
          <Button type="submit">Back to sign in</Button>
        </form>
      </div>
    </AuthShell>
  );
}

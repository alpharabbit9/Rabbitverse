import { redirect } from "next/navigation";
import { updatePassword } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/password-forms";

/**
 * Landing page for the emailed reset link. `/auth/callback` has already
 * exchanged the code for a session by the time we get here, so a visitor with
 * no session either arrived directly or used an expired link — the form says so
 * instead of failing on submit.
 */
export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <ResetPasswordForm updatePassword={updatePassword} ready={Boolean(user)} />;
}

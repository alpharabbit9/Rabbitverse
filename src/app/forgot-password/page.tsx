import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export default function ForgotPasswordPage() {
  if (!isSupabaseConfigured) redirect("/login");
  return <ForgotPasswordForm requestReset={requestPasswordReset} />;
}

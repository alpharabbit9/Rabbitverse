import { redirect } from "next/navigation";
import { signInWithGoogle, signUpWithPassword } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SignUpForm } from "@/components/auth/signup-form";

/** There is nothing to sign up *to* without a database, so demo mode sends you home. */
export default function SignUpPage() {
  if (!isSupabaseConfigured) redirect("/login");
  return <SignUpForm signUp={signUpWithPassword} signInWithGoogle={signInWithGoogle} />;
}

import { signInWithGoogle, signInWithPassword } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginExperience } from "@/components/auth/login-experience";

const ERRORS: Record<string, string> = {
  auth: "Sign-in didn’t complete. Please try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Something went wrong. Try again.") : null;

  return (
    <LoginExperience
      configured={isSupabaseConfigured}
      message={message}
      signIn={signInWithGoogle}
      signInWithPassword={signInWithPassword}
    />
  );
}

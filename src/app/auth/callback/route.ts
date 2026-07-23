import { NextResponse } from "next/server";
import { ALLOWED_EMAIL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** OAuth callback: exchange the code for a session, then enforce the allowlist. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Behind Vercel's proxy `request.url` can carry an internal/http origin, which
  // breaks the redirect back to the app. Prefer the canonical site URL, then the
  // forwarded host, and only fall back to the raw origin (local dev).
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const email = data.user?.email?.toLowerCase();
      if (ALLOWED_EMAIL && email !== ALLOWED_EMAIL) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${base}/login?error=not-allowed`);
      }
      return NextResponse.redirect(`${base}/`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}

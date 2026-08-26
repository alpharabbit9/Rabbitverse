import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-link callback: exchange the code for a session, then check the
 * account is allowed in.
 *
 * The single-email allowlist is gone — Rabbit Verse is self-serve now. What
 * replaces it is the roster: `public.users.status = 'suspended'` is the only
 * thing that turns a valid session away.
 *
 * `next` lets one callback serve several flows (the password-reset link sends
 * `next=/auth/reset`). It is validated as a same-origin path so the link can't
 * be turned into an open redirect.
 */
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

  // Only a relative, single-slash path — never "//evil.com" or an absolute URL.
  const requested = searchParams.get("next") ?? "/";
  const next = /^\/(?!\/)[A-Za-z0-9\-._~/?#[\]@!$&'()*+,;=%]*$/.test(requested) ? requested : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const userId = data.user?.id;
      if (userId) {
        const { data: roster } = await supabase.from("users").select("status").eq("id", userId).maybeSingle();
        if (roster?.status === "suspended") {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${base}/suspended`);
        }
      }
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}

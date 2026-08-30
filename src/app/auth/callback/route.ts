import { NextResponse } from "next/server";
import { getSignupMode } from "@/lib/data/signup";
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
 *
 * THE SIGNUP GATE LANDS HERE, TOO. Google creates the `auth.users` row before
 * any of this runs, so a refusal from `handle_new_user()` (`0008_invites.sql`)
 * arrives as an aborted exchange: GoTrue bounces back with
 * `?error=server_error&error_description=Database+error+saving+new+user`. All we
 * can do is recognise it and send the person somewhere that explains itself
 * instead of a bare `?error=auth`.
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

  /**
   * Was this failure the door, or something else? Asking the mode is the only
   * way to tell — the error GoTrue hands back is the same generic "database
   * error" whichever exception the trigger raised.
   *
   * Only sent to /signup when the door is actually shut. An `open` app that
   * failed for some other reason keeps the old `?error=auth` on /login, because
   * pointing somebody at a signup gate that is not there would be a lie.
   */
  const blockedOrHome = async (): Promise<string> => {
    const mode = await getSignupMode();
    return mode === "open" ? `${base}/login?error=auth` : `${base}/signup?blocked=${mode}`;
  };

  // GoTrue puts the failure straight on the callback when the trigger aborts,
  // and there is no `code` to exchange in that case.
  if (searchParams.get("error")) {
    return NextResponse.redirect(await blockedOrHome());
  }

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

    return NextResponse.redirect(await blockedOrHome());
  }

  // No `code` and no `?error` — but with PKCE some GoTrue paths (and the OAuth
  // provider itself) deliver the failure in the URL *fragment*, which a server
  // handler never receives. Hand the browser a bare script that lifts any
  // `#error` up into the query string and re-hits this same route, so the
  // branch above can treat it like any other refusal. No error in the hash
  // either → it really was just a bare hit, so fall through to /login.
  const bounce = `${base}/login?error=auth`;
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Signing in…</title><script>(function(){` +
      `var h=new URLSearchParams(location.hash.slice(1));` +
      `var e=h.get("error")||h.get("error_code");` +
      `if(e){var d=h.get("error_description")||"";` +
      `location.replace(location.origin+location.pathname+"?error="+encodeURIComponent(e)+(d?"&error_description="+encodeURIComponent(d):""));}` +
      `else{location.replace(${JSON.stringify(bounce)});}` +
      `})();</script>`,
    { headers: { "content-type": "text/html; charset=utf-8" }, status: 200 },
  );
}

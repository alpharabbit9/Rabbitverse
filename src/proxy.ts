import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/*
  Next 16 "proxy" (the renamed middleware). Refreshes the Supabase session on
  every request and gates private routes behind sign-in. In demo mode (no
  Supabase env) it is a no-op so the sample-data app keeps working.
*/
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Everything a signed-out visitor legitimately needs: sign in, sign up, get a
  // password back, complete an email link, or read the suspension notice.
  const PUBLIC = ["/login", "/signup", "/forgot-password", "/suspended", "/auth", "/offline"];
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  // Signed in already? The sign-in and sign-up screens have nothing to offer.
  if (user && (path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/forgot-password"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Suspension is deliberately *not* checked here: it would cost a database
  // round-trip on every single request. It is enforced where entry actually
  // happens — `signInWithPassword`, `/auth/callback` — and again in
  // `(app)/layout.tsx`, which already reads the roster via `getSession()`.
  //
  // /admin is the one exception, and only because it is PATH-SCOPED: the roster
  // read below runs on a handful of requests a day rather than on all of them,
  // so the no-round-trip rule above still holds for every route a member uses.
  // The check is duplicated in `(admin)/layout.tsx`, which remains the
  // authoritative gate — this is a fast door in front of it, not a replacement.
  //
  // A non-admin is REWRITTEN, not redirected: there is no reason to teach
  // anybody that /admin exists, so it simply 404s like any other bad URL.
  // Rewriting to "/404" (a path with no route) is deliberate and verified —
  // Next 16 serves the not-found page with a real 404 status for it, so this is
  // NOT a stale Pages-Router artifact to "fix".
  if (user && path.startsWith("/admin")) {
    const { data: roster } = await supabase
      .from("users")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    // Mirrors the SQL `is_admin()`: a suspended admin is not an admin.
    if (roster?.role !== "admin" || roster.status !== "active") {
      const url = request.nextUrl.clone();
      url.pathname = "/404";
      return NextResponse.rewrite(url, { status: 404 });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.webmanifest|.*\\.(?:png|svg|ico)$).*)"],
};

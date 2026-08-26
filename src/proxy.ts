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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.webmanifest|.*\\.(?:png|svg|ico)$).*)"],
};

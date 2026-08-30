import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { Icon } from "@/components/icon";
import { requireAdmin } from "@/lib/admin/guard";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";

/*
  The admin shell — its own route group, deliberately.

  `(app)/layout.tsx` fans out five mood-signal queries, a profile summary and the
  mascot provider before it renders anything. None of that means a thing here,
  and paying for it on every admin page would be silly. This group renders under
  the root layout (fonts, theme, <Toaster/>) and nothing else.

  It is also visually sober on purpose: no aura, no creature, no gradients. This
  is the room where you suspend somebody's account, and it should not feel like
  the room where you log a sandwich.

  `requireAdmin()` is the authoritative gate. `proxy.ts` blocks /admin at the
  edge too, but that is a fast path in front of this, not a substitute for it.
*/

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl border border-border bg-card-hover">
              <Icon name="ShieldCheck" size={17} style={{ color: "var(--accent-gold)" }} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Admin</div>
              <div className="text-[11px] text-fg-muted">{session.email ?? "signed in"}</div>
            </div>
          </div>

          <AdminNav />

          <Link
            href="/"
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
          >
            <Icon name="ArrowLeft" size={15} />
            Back to app
          </Link>
        </div>
      </header>

      {!isServiceRoleConfigured && (
        <div
          role="status"
          className="border-b border-accent-gold/25 bg-accent-gold/10 px-4 py-2.5 text-center text-xs text-fg-secondary sm:px-6 lg:px-10"
        >
          <strong className="font-semibold text-fg">Read-only.</strong> `SUPABASE_SERVICE_ROLE_KEY` is not set, so
          suspending, promoting and password resets will refuse. Everything below is still accurate.
        </div>
      )}

      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}

import Link from "next/link";
import { headers } from "next/headers";
import { Icon } from "@/components/icon";
import { requireAdmin } from "@/lib/admin/guard";
import { SIGNUP_MODE_COPY } from "@/lib/admin/roles";
import { INVITE_PAGE_SIZE } from "@/lib/admin/types";
import { getAdminOverview, getInvites } from "@/lib/data/admin";
import { currentDay } from "@/lib/session";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { InvitesPanel } from "./invites-panel";

/*
  /admin/invites — the keys to the door.

  An invite is a code somebody types, an address that is let in however it signs
  up, or both. The second kind is the one that matters for Google: there is
  nowhere to type a code on a consent screen, so an invited Google user has to be
  invited *by address*. The panel says so rather than leaving it to be discovered.

  Codes are only ever generated server-side (`createInvite`), and `invites` has an
  admins-only select policy — nobody else can read a code out of the database.
*/

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InvitesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(0, Number.parseInt(raw ?? "", 10) || 0);
  const offset = page * INVITE_PAGE_SIZE;

  const [invites, overview, today, h] = await Promise.all([
    getInvites(offset, INVITE_PAGE_SIZE),
    getAdminOverview(),
    currentDay(),
    headers(),
  ]);

  // The origin the copied links are built from — the canonical site URL when one
  // is configured, otherwise whatever host this request arrived on.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  const mode = overview.signupMode;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Invites</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Codes and invited addresses. Only relevant while sign-ups are invite-only.
        </p>
      </header>

      {mode !== "invite" && (
        <div
          role="status"
          className="glass flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl px-4 py-3 text-sm"
        >
          <Icon
            name={mode === "open" ? "Globe" : "ShieldCheck"}
            size={16}
            style={{ color: mode === "open" ? "var(--accent-cyan)" : "var(--accent-gold)" }}
          />
          <span className="font-medium">Sign-ups are {SIGNUP_MODE_COPY[mode].label.toLowerCase()}.</span>
          <span className="text-xs text-fg-muted">
            {mode === "open"
              ? "Invites are ignored — anyone with the link can create an account."
              : "Nobody can create an account, invited or not."}
          </span>
          <Link
            href="/admin/settings"
            className="ml-auto flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-border-strong hover:text-fg"
          >
            Change <Icon name="ArrowRight" size={13} />
          </Link>
        </div>
      )}

      <InvitesPanel
        rows={invites.rows}
        total={invites.total}
        offset={invites.offset}
        page={page}
        today={today}
        origin={origin}
        canWrite={isServiceRoleConfigured}
      />
    </div>
  );
}

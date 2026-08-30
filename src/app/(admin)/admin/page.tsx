import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireAdmin } from "@/lib/admin/guard";
import { SIGNUP_MODE_COPY } from "@/lib/admin/roles";
import { ADMIN_PAGE_SIZE, ROSTER_SORT_KEYS, type RosterSortKey, type SortDir } from "@/lib/admin/types";
import { getAdminOverview, getAdminUsers } from "@/lib/data/admin";
import { currentDay } from "@/lib/session";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { UsersTable } from "./users-table";

/*
  /admin — who has an account, and how much of the app they actually use.

  Everything on this page is a NUMBER. There is no view of anybody's journal,
  notes or project text, and there is no route to one: the two RPCs feeding it
  return bigint columns (see `0007_admin.sql`). Counts answer the questions an
  owner has — is this account real, is it active, is it abusive — without
  reading anyone's diary to find out.
*/

interface PageProps {
  // Next 16: searchParams is a Promise.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

function Stat({ label, value, icon, accent, hint }: { label: string; value: number | string; icon: string; accent: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <Icon name={icon} size={14} style={{ color: accent }} />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-fg-muted">{hint}</div>}
    </div>
  );
}

export default async function AdminPage({ searchParams }: PageProps) {
  const session = await requireAdmin();
  const sp = await searchParams;

  const search = one(sp.q).slice(0, 80);
  const sortParam = one(sp.sort);
  const sort: RosterSortKey = (ROSTER_SORT_KEYS as readonly string[]).includes(sortParam)
    ? (sortParam as RosterSortKey)
    : "created_at";
  const dir: SortDir = one(sp.dir) === "asc" ? "asc" : "desc";
  const page = Math.max(0, Number.parseInt(one(sp.page), 10) || 0);
  const offset = page * ADMIN_PAGE_SIZE;

  const [overview, users, today] = await Promise.all([
    getAdminOverview(),
    getAdminUsers({ search, sort, dir, limit: ADMIN_PAGE_SIZE, offset }),
    currentDay(),
  ]);

  const mode = SIGNUP_MODE_COPY[overview.signupMode];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Who holds an account and how much they log. Counts only — never what they wrote.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Accounts" value={overview.totalUsers} icon="Users" accent="var(--accent-blue)" />
        <Stat
          label="New"
          value={overview.new7d}
          icon="TrendingUp"
          accent="var(--accent-mint)"
          hint={`${overview.new30d} in the last 30 days`}
        />
        <Stat
          label="Admins"
          value={overview.admins}
          icon="ShieldCheck"
          accent="var(--accent-gold)"
          hint={overview.admins <= 1 ? "the last one cannot be demoted" : undefined}
        />
        <Stat
          label="Suspended"
          value={overview.suspended}
          icon="UserX"
          accent={overview.suspended > 0 ? "var(--accent-rose)" : "var(--fg-muted)"}
        />
      </div>

      {/* The number that matters most — can strangers still get in? — sits on the
          first page rather than only behind the Settings tab. */}
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm">
        <Icon
          name={overview.signupMode === "open" ? "Globe" : "ShieldCheck"}
          size={16}
          style={{ color: overview.signupMode === "open" ? "var(--accent-cyan)" : "var(--accent-gold)" }}
        />
        <span className="font-medium">Sign-ups: {mode.label}</span>
        <span className="text-xs text-fg-muted">{mode.description}</span>
        {overview.signupMode === "invite" && overview.liveInvites > 0 && (
          <Link href="/admin/invites" className="text-xs text-fg-muted underline underline-offset-4 hover:text-fg">
            {overview.liveInvites} live invite{overview.liveInvites === 1 ? "" : "s"}
          </Link>
        )}
        <Link
          href="/admin/settings"
          className="ml-auto flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-border-strong hover:text-fg"
        >
          Change <Icon name="ArrowRight" size={13} />
        </Link>
      </div>

      <UsersTable
        rows={users.rows}
        total={users.total}
        offset={users.offset}
        search={search}
        sort={sort}
        dir={dir}
        today={today}
        actorId={session.userId}
        adminCount={overview.admins}
        canWrite={isServiceRoleConfigured}
      />
    </div>
  );
}

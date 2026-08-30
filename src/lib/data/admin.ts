/*
  The admin panel's entire read surface. There is no other one.

  Four queries live here and nothing else:

    rpc("admin_overview")    -> totals + the signup mode
    rpc("admin_user_stats")  -> one page of the roster, with bigint counts
    from("admin_audit_log")  -> the moderation trail
    from("invites")          -> the invite list (admins-only select policy)

  All four run on the ORDINARY cookie-bound client — the same anon key every
  member uses — so RLS still applies to this request exactly as it does to
  everyone else's. The two RPCs are `security definer` and guard themselves with
  `is_admin()`; they return numbers, never rows a user wrote.

  That is the counts-only guarantee, and it is structural rather than
  disciplinary: this module cannot leak a private sentence because it never
  queries a table that holds one. `read-surface.test.ts` reads this file as text
  and fails the build if a content table name ever appears in it — including in
  a comment, which is why the prose above talks around them.

  Server-only (cookie client). Mirrors the shape of the other `lib/data/*`
  modules; `React.cache()` so a page and its header can both ask without a
  second round-trip.
*/

import { cache } from "react";
import { toSignupMode, toUserRole, toUserStatus } from "@/lib/admin/roles";
import {
  ADMIN_PAGE_SIZE,
  AUDIT_PAGE_SIZE,
  COUNT_COLUMNS,
  INVITE_PAGE_SIZE,
  type AdminCounts,
  type AdminOverview,
  type AdminUserRow,
  type AuditRow,
  type Invite,
  type RosterSortKey,
  type SortDir,
} from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

const num = (v: unknown): number => {
  // Postgres bigints arrive as strings once they exceed 2^53 in PostgREST's
  // JSON; Number() handles both shapes and NaN cannot survive the guard.
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

/**
 * A failed admin RPC is exceptional — the caller has already passed
 * `requireAdmin()` — so it surfaces as a thrown error and lands on the admin
 * error boundary rather than being smoothed into an empty panel that looks like
 * "you have no users".
 */
function boom(what: string, message: string): never {
  throw new Error(`Admin read failed (${what}): ${message}. Has migration 0007_admin.sql been applied?`);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export const getAdminOverview = cache(async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) boom("admin_overview", error.message);

  const row = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  return {
    totalUsers: num(row?.total_users),
    admins: num(row?.admins),
    suspended: num(row?.suspended),
    new7d: num(row?.new_7d),
    new30d: num(row?.new_30d),
    liveInvites: num(row?.live_invites),
    signupMode: toSignupMode(row?.signup_mode),
  };
});

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

export interface AdminUserQuery {
  search?: string;
  sort?: RosterSortKey;
  dir?: SortDir;
  limit?: number;
  offset?: number;
}

export interface AdminUserPage {
  rows: AdminUserRow[];
  /** How many users match the search, not how many are on this page. */
  total: number;
  offset: number;
  limit: number;
}

function shapeCounts(row: Row): AdminCounts {
  // Walked from the column table rather than written out field by field — which
  // is the trick that keeps every one of those names out of this file.
  const counts = {} as AdminCounts;
  for (const c of COUNT_COLUMNS) counts[c.key] = num(row[c.column]);
  return counts;
}

export const getAdminUsers = cache(async function getAdminUsers({
  search = "",
  sort = "created_at",
  dir = "desc",
  limit = ADMIN_PAGE_SIZE,
  offset = 0,
}: AdminUserQuery = {}): Promise<AdminUserPage> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_user_stats", {
    p_search: search.trim() || null,
    p_sort: sort,
    p_dir: dir,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) boom("admin_user_stats", error.message);

  const rows = (data ?? []) as Row[];
  return {
    rows: rows.map((r) => ({
      id: String(r.id),
      email: String(r.email ?? ""),
      name: str(r.name),
      status: toUserStatus(r.status),
      role: toUserRole(r.role),
      createdAt: String(r.created_at ?? ""),
      lastActive: str(r.last_active),
      counts: shapeCounts(r),
    })),
    // `match_count` rides on every row (one cross join, not a second query); it
    // is simply absent when the page is empty.
    total: rows.length > 0 ? num(rows[0].match_count) : 0,
    offset,
    limit,
  };
});

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export interface AuditPage {
  rows: AuditRow[];
  total: number;
  offset: number;
  limit: number;
}

export const getAuditLog = cache(async function getAuditLog(
  offset = 0,
  limit = AUDIT_PAGE_SIZE,
): Promise<AuditPage> {
  const supabase = await createClient();
  // Columns spelled out rather than `*`: this table is safe either way, but the
  // habit is what keeps the read surface auditable at a glance.
  const { data, error, count } = await supabase
    .from("admin_audit_log")
    .select("id, actor_id, actor_email, action, target_id, target_email, detail, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) boom("admin_audit_log", error.message);

  return {
    rows: ((data ?? []) as Row[]).map((r) => ({
      id: String(r.id),
      actorId: str(r.actor_id),
      actorEmail: str(r.actor_email),
      action: String(r.action ?? ""),
      targetId: str(r.target_id),
      targetEmail: str(r.target_email),
      detail: (r.detail ?? {}) as Record<string, unknown>,
      createdAt: String(r.created_at ?? ""),
    })),
    total: count ?? 0,
    offset,
    limit,
  };
});

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export interface InvitePage {
  rows: Invite[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Every invite ever made, newest first — spent and revoked ones included, so
 * "did I already send them one?" is answerable.
 *
 * Read on the cookie client like everything else here. `invites` has an
 * admins-only select policy and no write policy at all (`0008_invites.sql`), so
 * a member asking for this gets an empty list rather than a code.
 */
export const getInvites = cache(async function getInvites(
  offset = 0,
  limit = INVITE_PAGE_SIZE,
): Promise<InvitePage> {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("invites")
    .select("id, code, email, max_uses, uses, expires_at, revoked_at, note, created_by, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) boom("invites", error.message);

  return {
    rows: ((data ?? []) as Row[]).map((r) => ({
      id: String(r.id),
      code: String(r.code ?? ""),
      email: str(r.email),
      maxUses: num(r.max_uses),
      uses: num(r.uses),
      expiresAt: str(r.expires_at),
      revokedAt: str(r.revoked_at),
      note: str(r.note),
      createdBy: str(r.created_by),
      createdAt: String(r.created_at ?? ""),
    })),
    total: count ?? 0,
    offset,
    limit,
  };
});

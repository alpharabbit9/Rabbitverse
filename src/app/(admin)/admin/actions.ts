"use server";

/*
  Moderation. The only file in the app that opens a service-role client.

  Every action walks the same seven steps, in this order:

    1. assertAdmin()                — is the caller an active admin at all?
    2. isServiceRoleConfigured      — can we write? (reads work without it)
    3. rateLimit()                  — Redis, fails open, same as the AI paths
    4. validate the arguments       — against the pure predicates in roles.ts
    5. read the target + admin count, run the pure guard from guards.ts
    6. write with createAdminClient()
    7. audit the write, then revalidatePath("/admin")

  Steps 4 and 5 duplicate checks the UI already made. That is the design: the
  buttons are disabled with a reason for the admin's benefit, and re-checked here
  because a disabled button is a suggestion, not a control.

  The service-role client bypasses RLS entirely, so it touches exactly four
  tables — `public.users`, `public.admin_audit_log`, `public.app_settings` and
  `public.invites` — and never a content table. There is nothing here that can
  read what a user wrote.
*/

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { assertAdmin } from "@/lib/admin/guard";
import { canChangeRole, canChangeStatus, canDeleteUser, confirmationMatches } from "@/lib/admin/guards";
import {
  DEFAULT_INVITE_DAYS,
  INVITE_EXPIRY_OPTIONS,
  INVITE_USE_OPTIONS,
  expiryFromDays,
  generateInviteCode,
} from "@/lib/admin/invites";
import { isSignupMode, isUserRole, isUserStatus } from "@/lib/admin/roles";
import type { SignupMode, UserRole, UserStatus } from "@/lib/admin/types";
import { rateLimit } from "@/lib/redis";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; error: string | null };

const fail = (error: string): ActionResult => ({ ok: false, error });
const done = (): ActionResult => ({ ok: true, error: null });

/** Everything an action needs to know about the person it is about to act on. */
interface Target {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

/**
 * The roster row + the number of active admins, read with the service-role
 * client because RLS on `public.users` is select-own: an admin genuinely cannot
 * see anybody else's row on the cookie client.
 */
async function readTarget(userId: string): Promise<{ target: Target | null; adminCount: number }> {
  const admin = createAdminClient();
  const [{ data: row }, { count }] = await Promise.all([
    admin.from("users").select("id, email, role, status").eq("id", userId).maybeSingle(),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active"),
  ]);

  const target: Target | null = row
    ? {
        id: String(row.id),
        email: String(row.email ?? ""),
        role: (row.role === "admin" ? "admin" : "member") as UserRole,
        status: (row.status === "suspended" ? "suspended" : "active") as UserStatus,
      }
    : null;

  return { target, adminCount: count ?? 0 };
}

/**
 * Append to the trail. Best-effort by design: the write it records has already
 * happened, and refusing to report success because the *log* failed would be
 * both a lie and a worse outcome. A failure is loud in the server logs instead.
 *
 * `detail` carries shape-facts only — never anything a user typed.
 */
async function audit(entry: {
  actorId: string;
  actorEmail: string | null;
  action: string;
  targetId: string | null;
  targetEmail: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("admin_audit_log").insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      action: entry.action,
      target_id: entry.targetId,
      target_email: entry.targetEmail,
      detail: entry.detail ?? {},
    });
    if (error) console.error("[admin] audit insert failed", error.message);
  } catch (e) {
    console.error("[admin] audit insert threw", e instanceof Error ? e.message : e);
  }
}

/** Steps 1–3, which every action shares. */
async function preflight(prefix: string, limit: number) {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false as const, error: guard.error };

  if (!isServiceRoleConfigured) {
    return {
      ok: false as const,
      error: "SUPABASE_SERVICE_ROLE_KEY is not set on this deployment, so nothing can be changed from here.",
    };
  }

  // Fails open when Upstash is unconfigured, exactly like the AI guardrails.
  const rl = await rateLimit(guard.session.userId, { limit, windowSeconds: 3600, prefix });
  if (!rl.allowed) return { ok: false as const, error: "Too many admin actions in the last hour. Give it a few minutes." };

  return { ok: true as const, session: guard.session };
}

// ---------------------------------------------------------------------------

/**
 * Suspend or reactivate an account.
 *
 * `public.users.status` is the whole mechanism — the app checks it at sign-in,
 * at the OAuth callback and in `(app)/layout.tsx` on every request. So a
 * suspended user with a live session is stopped the moment they navigate.
 *
 * It does NOT revoke their JWT. Supabase's `auth.admin.signOut()` takes the
 * *user's own* access token, which an admin does not hold, and there is no
 * server-side session-revocation call in supabase-js v2 that does not also
 * break the friendly `/suspended` landing (a GoTrue ban makes sign-in fail with
 * a generic credentials error instead). The residual gap is a Server Action
 * fired from an already-loaded tab; RLS still confines that to the user's own
 * rows. Worth revisiting if suspension ever needs to be instant.
 */
export async function setUserStatus(userId: string, next: unknown): Promise<ActionResult> {
  const pre = await preflight("rl:admin", 60);
  if (!pre.ok) return fail(pre.error);
  if (!isUserStatus(next)) return fail("Unknown status.");
  if (!userId) return fail("No account given.");

  const { target } = await readTarget(userId);
  if (!target) return fail("That account no longer exists.");
  if (target.status === next) return done();

  const refusal = canChangeStatus({ actorId: pre.session.userId, targetId: userId, next });
  if (refusal) return fail(refusal);

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ status: next }).eq("id", userId);
  if (error) return fail(error.message);

  await audit({
    actorId: pre.session.userId,
    actorEmail: pre.session.email,
    action: "user.status.set",
    targetId: userId,
    targetEmail: target.email,
    detail: { from: target.status, to: next },
  });

  revalidatePath("/admin");
  return done();
}

/** Promote to admin, or demote back to member. */
export async function setUserRole(userId: string, next: unknown): Promise<ActionResult> {
  const pre = await preflight("rl:admin", 60);
  if (!pre.ok) return fail(pre.error);
  if (!isUserRole(next)) return fail("Unknown role.");
  if (!userId) return fail("No account given.");

  const { target, adminCount } = await readTarget(userId);
  if (!target) return fail("That account no longer exists.");
  if (target.role === next) return done();

  const refusal = canChangeRole({
    actorId: pre.session.userId,
    targetId: userId,
    current: target.role,
    next,
    adminCount,
  });
  if (refusal) return fail(refusal);

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ role: next }).eq("id", userId);
  if (error) return fail(error.message);

  await audit({
    actorId: pre.session.userId,
    actorEmail: pre.session.email,
    action: "user.role.set",
    targetId: userId,
    targetEmail: target.email,
    detail: { from: target.role, to: next },
  });

  // Role is read per request from the database, never from a JWT claim, so the
  // change is live on the target's very next page load.
  revalidatePath("/admin");
  return done();
}

/**
 * Email the user a password-reset link.
 *
 * Sent from the COOKIE client, not the service role: `resetPasswordForEmail`
 * actually delivers mail on Supabase's default SMTP, whereas
 * `auth.admin.generateLink({ type: "recovery" })` returns a link and sends
 * nothing unless custom SMTP is configured. Same call the signed-out
 * `/forgot-password` form makes, same landing page.
 *
 * Tighter rate limit than the rest, because this one leaves the building.
 */
export async function sendPasswordReset(userId: string): Promise<ActionResult> {
  const pre = await preflight("rl:admin:reset", 5);
  if (!pre.ok) return fail(pre.error);
  if (!userId) return fail("No account given.");

  const { target } = await readTarget(userId);
  if (!target?.email) return fail("That account has no email address on file.");

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset")}`,
  });
  if (error) return fail(error.message);

  await audit({
    actorId: pre.session.userId,
    actorEmail: pre.session.email,
    action: "user.password_reset",
    targetId: userId,
    targetEmail: target.email,
  });

  return done();
}

/**
 * Delete an account and everything in it. The one irreversible thing this panel
 * can do.
 *
 * ONE CALL DOES ALL OF IT. Every content table's `user_id` is
 * `references auth.users (id) on delete cascade` (0001, 0002), and
 * `public.users` / `public.user_profiles` cascade the same way (0004), so
 * removing the `auth.users` row takes the roster row, the profile and all
 * eleven content tables with it. There is nothing left to sweep up, and no
 * backup to restore from.
 *
 * THE AUDIT ROW IS WRITTEN FIRST, deliberately. `admin_audit_log.target_id` is
 * `on delete set null`, so a row written afterwards would point at nobody —
 * and if the log write ever failed, the single permanent action in the app
 * would be the one action leaving no trace. Writing first costs a row that says
 * "deleted" about an account that survived a failed delete, which is why the
 * failure path below appends `user.delete_failed` rather than staying quiet.
 * `target_email` is a denormalised copy, so the trail stays legible forever.
 *
 * `confirmEmail` is checked here as well as in the modal, by the same pure
 * function, for the usual reason: a disabled button is a suggestion.
 */
export async function deleteUserAccount(userId: string, confirmEmail: string): Promise<ActionResult> {
  // Tighter than the rest on purpose. 60 reversible writes an hour is a
  // generous allowance; 60 deletions an hour is a compromised session emptying
  // the database.
  const pre = await preflight("rl:admin:delete", 10);
  if (!pre.ok) return fail(pre.error);
  if (!userId) return fail("No account given.");

  const { target, adminCount } = await readTarget(userId);
  if (!target) return fail("That account no longer exists.");

  const refusal = canDeleteUser({
    actorId: pre.session.userId,
    targetId: userId,
    targetRole: target.role,
    adminCount,
  });
  if (refusal) return fail(refusal);

  if (!confirmationMatches(confirmEmail ?? "", target.email)) {
    return fail("That is not this account's email address.");
  }

  await audit({
    actorId: pre.session.userId,
    actorEmail: pre.session.email,
    action: "user.delete",
    targetId: userId,
    targetEmail: target.email,
    detail: { role: target.role, status: target.status },
  });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    await audit({
      actorId: pre.session.userId,
      actorEmail: pre.session.email,
      action: "user.delete_failed",
      targetId: userId,
      targetEmail: target.email,
      detail: { reason: error.message },
    });
    return fail(error.message);
  }

  revalidatePath("/admin");
  return done();
}

// ---------------------------------------------------------------------------
// The door: signup mode + invites
// ---------------------------------------------------------------------------

/** An invite action also hands back the code it just made, so the UI can offer a link. */
export type InviteResult = ActionResult & { code: string | null };

const inviteFail = (error: string): InviteResult => ({ ok: false, error, code: null });

export interface CreateInviteInput {
  /** Bind the invite to one address — the only way to invite a Google account. */
  email?: string;
  maxUses?: number;
  /** `null` means it never expires. */
  expiresInDays?: number | null;
  note?: string;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Open, invite-only, or closed.
 *
 * The mode lives in the `app_settings` singleton and is read in three places:
 * `/signup` (to decide what to render), `signUpWithPassword` (which never trusts
 * what was rendered), and `handle_new_user()` (which is the only one that
 * actually decides). Flipping it here changes all three at once.
 *
 * NOBODY IS EVER LOCKED OUT BY THIS. The gate refuses account *creation*; every
 * existing account keeps signing in in every mode.
 */
export async function setSignupMode(next: unknown): Promise<ActionResult> {
  const pre = await preflight("rl:admin", 60);
  if (!pre.ok) return fail(pre.error);
  if (!isSignupMode(next)) return fail("Unknown signup mode.");

  const admin = createAdminClient();
  const { data: current } = await admin.from("app_settings").select("signup_mode").eq("id", true).maybeSingle();
  const from = (current?.signup_mode ?? "open") as SignupMode;
  if (from === next) return done();

  // Upsert rather than update: `app_settings` is seeded by 0007, but a database
  // whose singleton went missing should get one back rather than silently
  // accept a write that changed no rows.
  const { error } = await admin
    .from("app_settings")
    .upsert({ id: true, signup_mode: next, updated_at: new Date().toISOString(), updated_by: pre.session.userId });
  if (error) return fail(error.message);

  await audit({
    actorId: pre.session.userId,
    actorEmail: pre.session.email,
    action: "signup_mode.set",
    targetId: null,
    targetEmail: null,
    detail: { from, to: next },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/signup");
  return done();
}

/**
 * Mint an invite.
 *
 * The code is generated HERE, not in the browser: a client-generated code would
 * be a code the client chose. `generateInviteCode` is pure and takes its
 * randomness as an argument, so the entropy comes from `crypto.getRandomValues`
 * on this line and nowhere else.
 *
 * A collision is a 1-in-40-billion event that the unique index would turn into a
 * confusing error, so the insert simply tries again with a fresh code.
 */
export async function createInvite(input: CreateInviteInput): Promise<InviteResult> {
  const pre = await preflight("rl:admin:invite", 30);
  if (!pre.ok) return inviteFail(pre.error);

  const email = (input.email ?? "").trim().toLowerCase();
  if (email && !EMAIL_SHAPE.test(email)) return inviteFail("That doesn't look like an email address.");

  const maxUses = input.maxUses ?? 1;
  if (!(INVITE_USE_OPTIONS as readonly number[]).includes(maxUses)) return inviteFail("Unsupported number of uses.");

  const days = input.expiresInDays === undefined ? DEFAULT_INVITE_DAYS : input.expiresInDays;
  if (!INVITE_EXPIRY_OPTIONS.some((o) => o.days === days)) return inviteFail("Unsupported expiry.");

  const note = (input.note ?? "").trim().slice(0, 120);
  const admin = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode(crypto.getRandomValues(new Uint8Array(8)));
    const { error } = await admin.from("invites").insert({
      code,
      email: email || null,
      max_uses: maxUses,
      uses: 0,
      expires_at: expiryFromDays(days),
      note: note || null,
      created_by: pre.session.userId,
    });

    // 23505 = unique_violation, i.e. we drew a code that already exists.
    if (error && error.code === "23505") continue;
    if (error) return inviteFail(error.message);

    await audit({
      actorId: pre.session.userId,
      actorEmail: pre.session.email,
      action: "invite.create",
      targetId: null,
      targetEmail: email || null,
      detail: { code, maxUses, expiresInDays: days },
    });

    revalidatePath("/admin/invites");
    revalidatePath("/admin");
    return { ok: true, error: null, code };
  }

  return inviteFail("Could not generate an unused code. Try again.");
}

/**
 * Withdraw an invite.
 *
 * A revocation is a timestamp, never a delete: `invite_redemptions` references
 * the invite, and the answer to "who did this code let in?" has to survive the
 * code being switched off. Uses already spent stay spent — this only stops the
 * next one.
 */
export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const pre = await preflight("rl:admin", 60);
  if (!pre.ok) return fail(pre.error);
  if (!inviteId) return fail("No invite given.");

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("invites")
    .select("id, code, email, revoked_at")
    .eq("id", inviteId)
    .maybeSingle();
  if (!row) return fail("That invite no longer exists.");
  if (row.revoked_at) return done();

  const { error } = await admin
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (error) return fail(error.message);

  await audit({
    actorId: pre.session.userId,
    actorEmail: pre.session.email,
    action: "invite.revoke",
    targetId: null,
    targetEmail: (row.email as string | null) ?? null,
    detail: { code: String(row.code ?? "") },
  });

  revalidatePath("/admin/invites");
  revalidatePath("/admin");
  return done();
}

/*
  The rules that stop an admin from locking themselves — or everyone — out.

  Every one of these is a pure function returning `null` when the action is
  allowed, or the sentence to show the admin when it is not. That shape is the
  point: the same call runs twice, once in the browser to disable the button and
  put the reason in a tooltip, and once inside the Server Action before anything
  is written. The UI can be bypassed; the action cannot.

  There are exactly three ways to end up with an app nobody can administer:

    1. suspend yourself      — suspension revokes admin, so there is no way back
                               in short of the SQL editor;
    2. demote yourself       — same, minus the drama;
    3. demote or delete the  — the panel becomes unreachable for everybody.
       last remaining admin

  All three are refused. Nothing else here is a policy judgement; an admin may
  suspend, promote and demote anybody else freely.
*/

import type { UserRole, UserStatus } from "./types";

/** Suspending yourself would revoke your own admin rights and leave no way back. */
export function canChangeStatus({
  actorId,
  targetId,
  next,
}: {
  actorId: string;
  targetId: string;
  next: UserStatus;
}): string | null {
  if (actorId === targetId && next === "suspended") {
    return "You cannot suspend your own account — a suspended admin is no longer an admin.";
  }
  return null;
}

/**
 * Demotion is the guarded direction; promotion is always fine.
 *
 * `adminCount` is the number of *active* admins, straight from
 * `admin_overview()`, so it already excludes suspended ones.
 */
export function canChangeRole({
  actorId,
  targetId,
  current,
  next,
  adminCount,
}: {
  actorId: string;
  targetId: string;
  current: UserRole;
  next: UserRole;
  adminCount: number;
}): string | null {
  if (next === "admin") return null;
  if (current !== "admin") return null;

  if (actorId === targetId) {
    return "You cannot remove your own admin role. Promote somebody else first.";
  }
  if (adminCount <= 1) {
    return "This is the only admin left. Promote somebody else before demoting them.";
  }
  return null;
}

/** Same two traps, one step more permanent. Used by the Phase C delete flow. */
export function canDeleteUser({
  actorId,
  targetId,
  targetRole,
  adminCount,
}: {
  actorId: string;
  targetId: string;
  targetRole: UserRole;
  adminCount: number;
}): string | null {
  if (actorId === targetId) {
    return "You cannot delete your own account from here.";
  }
  if (targetRole === "admin" && adminCount <= 1) {
    return "This is the only admin left. Promote somebody else before deleting them.";
  }
  return null;
}

/**
 * Type-to-confirm. Trimmed and case-folded, because an email address is
 * case-insensitive and asking somebody to reproduce capitalisation exactly is
 * friction without safety.
 */
export function confirmationMatches(typed: string, email: string): boolean {
  const a = typed.trim().toLowerCase();
  const b = email.trim().toLowerCase();
  return a.length > 0 && a === b;
}

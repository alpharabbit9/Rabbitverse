/*
  What a role, a status and a signup mode are allowed to be — plus the words the
  UI uses for them.

  Pure predicates, no I/O. Every admin Server Action re-checks its arguments
  against these before touching the service-role client, so a hand-forged post
  cannot park `role = 'owner'` or `status = 'deleted'` in a column that only has
  a check constraint standing behind it.
*/

import type { SignupMode, UserRole, UserStatus } from "./types";

export const USER_ROLES: UserRole[] = ["member", "admin"];
export const USER_STATUSES: UserStatus[] = ["active", "suspended"];
export const SIGNUP_MODES: SignupMode[] = ["open", "invite", "closed"];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as string[]).includes(value);
}

export function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && (USER_STATUSES as string[]).includes(value);
}

export function isSignupMode(value: unknown): value is SignupMode {
  return typeof value === "string" && (SIGNUP_MODES as string[]).includes(value);
}

/** Coerce anything to a role, defaulting to the least privileged one. */
export function toUserRole(value: unknown): UserRole {
  return isUserRole(value) ? value : "member";
}

/** Coerce anything to a status, defaulting to the least restrictive one. */
export function toUserStatus(value: unknown): UserStatus {
  return isUserStatus(value) ? value : "active";
}

/** Coerce anything to a signup mode. Defaults OPEN, matching `signup_mode()`. */
export function toSignupMode(value: unknown): SignupMode {
  return isSignupMode(value) ? value : "open";
}

export const SIGNUP_MODE_COPY: Record<SignupMode, { label: string; description: string }> = {
  open: { label: "Open", description: "Anyone with the link can create an account." },
  invite: { label: "Invite only", description: "A live invite code — or an invited address — is required." },
  closed: { label: "Closed", description: "No new accounts. Everyone who already has one can still sign in." },
};

export const ROLE_COPY: Record<UserRole, { label: string; accent: string }> = {
  member: { label: "Member", accent: "var(--fg-muted)" },
  admin: { label: "Admin", accent: "var(--accent-gold)" },
};

export const STATUS_COPY: Record<UserStatus, { label: string; accent: string }> = {
  active: { label: "Active", accent: "var(--accent-mint)" },
  suspended: { label: "Suspended", accent: "var(--accent-rose)" },
};

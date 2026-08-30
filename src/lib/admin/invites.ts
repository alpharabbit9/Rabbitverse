/*
  Invite codes, as pure functions.

  Everything here is arithmetic and string work over values handed in — no
  `Date.now()`, no `crypto`, no database. `generateInviteCode` takes its
  randomness as an argument for exactly the reason `slidingWindowEstimate(…, now)`
  in `redis.ts` takes its clock as one: a function you can hand a fixed input to
  is a function you can test, and randomness that arrives from outside cannot
  surprise you.

  The caller supplies `crypto.getRandomValues(new Uint8Array(CODE_BYTES))`.
*/

import type { Invite, InviteStatus } from "./types";

/**
 * Crockford base32 with `0`, `1`, `O`, `I`, `L` and `U` removed.
 *
 * No pair of these looks like another pair on a phone screen or sounds like
 * another over the phone, which matters because the whole point of an invite
 * code is that a person reads it somewhere and types it somewhere else.
 * `U` is gone for the usual reason: it keeps accidental words out of the code.
 */
export const INVITE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Characters of randomness in a code — two groups of four. */
export const CODE_BYTES = 8;

/** `RV-` + two groups of four. */
const CODE_SHAPE = /^RV-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/;

/**
 * Build a printable code from raw bytes: `RV-7K2M-QX4B`.
 *
 * Eight characters over a 30-letter alphabet is a touch under 40 bits. That is
 * modest by key standards and ample here: the only way to test a guess is to
 * submit it to a signup form, each code is single-use by default, revocable,
 * usually expiring, and `invite_check` answers nothing but yes/no.
 *
 * `byte % 30` is very slightly biased toward the first sixteen letters (256 is
 * not a multiple of 30). Rejection sampling would need a variable number of
 * bytes and would make this function's output depend on how many it was given;
 * the bias costs about a hundredth of a bit per character, so it stays.
 */
export function generateInviteCode(bytes: Uint8Array): string {
  if (bytes.length < CODE_BYTES) {
    throw new Error(`generateInviteCode needs at least ${CODE_BYTES} bytes, got ${bytes.length}.`);
  }
  const chars = Array.from({ length: CODE_BYTES }, (_, i) => INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length]);
  return `RV-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/**
 * What somebody typed, turned into what is stored: upper-cased, stripped of
 * spaces and dashes, then re-grouped.
 *
 * People paste codes with the dashes, without them, in lower case, and with a
 * trailing space from the email they copied it out of. All four are the same
 * code. Anything that does not end up the right shape comes back as-is, so the
 * caller can tell the difference between "typed it oddly" and "typed nonsense".
 */
export function normalizeInviteCode(raw: string): string {
  const stripped = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  const body = stripped.startsWith("RV") ? stripped.slice(2) : stripped;
  if (body.length !== CODE_BYTES) return raw.trim().toUpperCase();
  return `RV-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** Whether a normalised code is even the right shape — checked before any round trip. */
export function isInviteCodeShape(code: string): boolean {
  return CODE_SHAPE.test(code);
}

/**
 * Why this invite can or cannot admit anybody, mirroring `invite_live()` in
 * `0008_invites.sql`.
 *
 * PRECEDENCE: revoked, then expired, then used, then live. A revoked invite
 * reads as revoked even if it also expired last week, because that is the state
 * somebody chose on purpose and the one they will be looking for. The other two
 * are just time passing.
 */
export function inviteStatus(
  invite: Pick<Invite, "uses" | "maxUses" | "expiresAt" | "revokedAt">,
  now: Date | number = Date.now(),
): InviteStatus {
  if (invite.revokedAt) return "revoked";

  const at = typeof now === "number" ? now : now.getTime();
  if (invite.expiresAt) {
    const expires = new Date(invite.expiresAt).getTime();
    if (Number.isFinite(expires) && expires <= at) return "expired";
  }

  if (invite.uses >= invite.maxUses) return "used";
  return "live";
}

export const INVITE_STATUS_COPY: Record<InviteStatus, { label: string; accent: string }> = {
  live: { label: "Live", accent: "var(--accent-mint)" },
  used: { label: "Used", accent: "var(--fg-muted)" },
  expired: { label: "Expired", accent: "var(--accent-orange)" },
  revoked: { label: "Revoked", accent: "var(--accent-rose)" },
};

/** How many uses are left, floored at zero so a revoked-mid-use invite can't read `-1`. */
export function usesRemaining(invite: Pick<Invite, "uses" | "maxUses">): number {
  return Math.max(0, invite.maxUses - invite.uses);
}

/** The uses an admin can pick, and the warning that comes with the shareable ones. */
export const INVITE_USE_OPTIONS = [1, 5, 25] as const;

/** The expiries an admin can pick. `null` days means never. */
export const INVITE_EXPIRY_OPTIONS: { days: number | null; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
  { days: null, label: "Never" },
];

export const DEFAULT_INVITE_DAYS = 14;

/** `expires_at` for an invite created now, or null when it should never expire. */
export function expiryFromDays(days: number | null, now: Date | number = Date.now()): string | null {
  if (days === null) return null;
  const at = typeof now === "number" ? now : now.getTime();
  return new Date(at + days * 86_400_000).toISOString();
}

/**
 * The link an admin copies. The code rides in a query parameter that `/signup`
 * prefills, so the invitee never types anything — but the field is still there,
 * because half of these get forwarded as plain text.
 */
export function inviteLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/signup?invite=${encodeURIComponent(code)}`;
}

/** "anyone with the code" / "rifat@example.com only" — who this invite is for. */
export function describeAudience(invite: Pick<Invite, "email">): string {
  return invite.email ?? "anyone with the code";
}

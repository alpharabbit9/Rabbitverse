"use client";

/*
  Making an invite, and looking at the ones you already made.

  Two decisions worth knowing about:

  * The code appears ONCE, in the banner, right after it is created — and then
    forever in the table, because `invites` is admin-readable and there is no
    security story in hiding a code from the person who minted it. The banner
    exists because a freshly made code is the one you are about to paste
    somewhere, and hunting for it in a fifty-row table would be silly.

  * Revoking is confirmed, creating is not. Creating an invite is undoable by
    revoking it; revoking one is not undoable at all (you would mint a new code
    and the old link would stay dead).
*/

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { describeDeadline, pageRangeLabel, relativeDay } from "@/lib/admin/format";
import {
  DEFAULT_INVITE_DAYS,
  INVITE_EXPIRY_OPTIONS,
  INVITE_STATUS_COPY,
  INVITE_USE_OPTIONS,
  describeAudience,
  inviteLink,
  inviteStatus,
  usesRemaining,
} from "@/lib/admin/invites";
import { INVITE_PAGE_SIZE, type Invite } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { createInvite, revokeInvite } from "../actions";

interface Props {
  rows: Invite[];
  total: number;
  offset: number;
  page: number;
  /** Today in the admin's own timezone, for the "expires in 6 days" wording. */
  today: string;
  /** Where the copied links point. */
  origin: string;
  canWrite: boolean;
}

const fieldCls =
  "w-full rounded-xl border border-border bg-card-hover/60 px-3 py-2 text-sm outline-none transition-colors hover:border-border-strong focus:border-border-strong disabled:opacity-50";

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied.`);
  } catch {
    // Clipboard access needs a secure context, which plain-http local dev is not.
    toast.error("Couldn't reach the clipboard — select the code and copy it by hand.");
  }
}

export function InvitesPanel({ rows, total, offset, page, today, origin, canWrite }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [maxUses, setMaxUses] = useState<number>(1);
  const [days, setDays] = useState<number | null>(DEFAULT_INVITE_DAYS);
  const [note, setNote] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Invite | null>(null);

  const disabled = !canWrite || pending;
  const lastPage = Math.max(0, Math.ceil(total / INVITE_PAGE_SIZE) - 1);

  const submit = () =>
    startTransition(async () => {
      const res = await createInvite({ email, maxUses, expiresInDays: days, note });
      if (!res.ok || !res.code) {
        toast.error(res.error ?? "That didn't work.");
        return;
      }
      setFresh(res.code);
      setEmail("");
      setNote("");
      toast.success("Invite created.");
      router.refresh();
    });

  const revoke = (invite: Invite) =>
    startTransition(async () => {
      const res = await revokeInvite(invite.id);
      if (!res.ok) {
        toast.error(res.error ?? "That didn't work.");
        return;
      }
      setRevoking(null);
      toast.success(`${invite.code} revoked.`);
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <section className="glass rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold">New invite</h2>
        <p className="mt-1 text-xs text-fg-secondary">
          Leave the address blank for a code anyone can type. Fill it in to admit one person however they sign
          up — <strong className="font-medium text-fg">including with Google</strong>, which has nowhere to type a
          code.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="text-xs text-fg-muted">Invite by email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled}
              placeholder="them@example.com"
              autoComplete="off"
              className={cn(fieldCls, "mt-1.5")}
            />
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">Uses</span>
            <select
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              disabled={disabled}
              className={cn(fieldCls, "mt-1.5")}
            >
              {INVITE_USE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "Single use" : `${n} uses`}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">Expires</span>
            <select
              value={days === null ? "never" : String(days)}
              onChange={(e) => setDays(e.target.value === "never" ? null : Number(e.target.value))}
              disabled={disabled}
              className={cn(fieldCls, "mt-1.5")}
            >
              {INVITE_EXPIRY_OPTIONS.map((o) => (
                <option key={o.label} value={o.days === null ? "never" : String(o.days)}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-fg-muted">Note to yourself (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={disabled}
              maxLength={120}
              placeholder="Cousin, met at the wedding"
              className={cn(fieldCls, "mt-1.5")}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="flex items-center gap-2 rounded-xl bg-fg px-4 py-2 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
          >
            {pending && <Icon name="Loader" size={14} className="animate-spin" />}
            Create invite
          </button>
          {maxUses > 1 && (
            <span className="text-xs text-fg-muted">
              A {maxUses}-use code is shareable by accident — whoever you send it to can pass it on {maxUses - 1}{" "}
              more times.
            </span>
          )}
          {!canWrite && <span className="text-xs text-fg-muted">Needs a service-role key.</span>}
        </div>

        {fresh && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-accent-mint/25 bg-accent-mint/5 px-4 py-3">
            <Icon name="Ticket" size={16} style={{ color: "var(--accent-mint)" }} />
            <code className="font-mono text-base font-semibold tracking-wider">{fresh}</code>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copy(fresh, "Code")}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-border-strong hover:text-fg"
              >
                Copy code
              </button>
              <button
                type="button"
                onClick={() => copy(inviteLink(origin, fresh), "Link")}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-border-strong hover:text-fg"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={() => setFresh(null)}
                aria-label="Dismiss"
                className="text-fg-muted transition-colors hover:text-fg"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="glass overflow-hidden rounded-2xl">
        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-fg-muted">
            No invites yet. The form above makes one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Code", "For", "Status", "Uses", "Expires", "Created", ""].map((h, i) => (
                    <th
                      key={h || i}
                      scope="col"
                      className="whitespace-nowrap bg-card-solid px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted"
                    >
                      {h || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((invite) => {
                  const status = inviteStatus(invite);
                  const copy_ = INVITE_STATUS_COPY[status];
                  return (
                    <tr key={invite.id} className="border-b border-border last:border-0 hover:bg-card-hover/50">
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <code className="font-mono text-xs tracking-wider">{invite.code}</code>
                        {invite.note && <div className="mt-0.5 max-w-[16rem] truncate text-[11px] text-fg-muted">{invite.note}</div>}
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-2.5 text-xs text-fg-secondary">
                        {describeAudience(invite)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ color: copy_.accent, backgroundColor: "color-mix(in srgb, currentColor 14%, transparent)" }}
                        >
                          {copy_.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-fg-secondary">
                        {invite.uses} / {invite.maxUses}
                        {status === "live" && invite.maxUses > 1 && (
                          <span className="ml-1 text-fg-muted">({usesRemaining(invite)} left)</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-fg-secondary">
                        {invite.expiresAt ? describeDeadline(invite.expiresAt.slice(0, 10), today) : "never"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-fg-muted">
                        {invite.createdAt ? relativeDay(invite.createdAt.slice(0, 10), today) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => copy(inviteLink(origin, invite.code), "Link")}
                          title="Copy the /signup link with this code prefilled"
                          aria-label={`Copy the link for ${invite.code}`}
                          className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-card-hover hover:text-fg"
                        >
                          <Icon name="Copy" size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={!canWrite || status === "revoked"}
                          title={
                            !canWrite
                              ? "Not available without a service-role key."
                              : status === "revoked"
                                ? "Already revoked."
                                : "Revoke"
                          }
                          onClick={() => setRevoking(invite)}
                          aria-label={`Revoke ${invite.code}`}
                          className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-card-hover hover:text-accent-rose disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-muted"
                        >
                          <Icon name="Ban" size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > INVITE_PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-fg-muted">
            <span>{pageRangeLabel(total, offset, rows.length)}</span>
            <div className="flex items-center gap-2">
              <PageLink to={page - 1} disabled={page <= 0} label="Prev" icon="ChevronLeft" />
              <PageLink to={page + 1} disabled={page >= lastPage} label="Next" icon="ChevronRight" trailing />
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={revoking !== null}
        tone="danger"
        title={`Revoke ${revoking?.code}?`}
        description={
          <>
            The link stops working immediately. Anyone who already used it keeps their account — this only closes
            the {revoking ? usesRemaining(revoking) : 0} use
            {revoking && usesRemaining(revoking) === 1 ? "" : "s"} that were left. It cannot be un-revoked; make a
            new invite instead.
          </>
        }
        confirmLabel="Revoke"
        pending={pending}
        onCancel={() => setRevoking(null)}
        onConfirm={() => revoking && revoke(revoking)}
      />
    </div>
  );
}

function PageLink({
  to,
  disabled,
  label,
  icon,
  trailing = false,
}: {
  to: number;
  disabled: boolean;
  label: string;
  icon: string;
  trailing?: boolean;
}) {
  const cls = "flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 transition-colors";
  const inner = trailing ? (
    <>
      {label} <Icon name={icon} size={13} />
    </>
  ) : (
    <>
      <Icon name={icon} size={13} /> {label}
    </>
  );
  if (disabled) return <span className={`${cls} opacity-40`}>{inner}</span>;
  return (
    <Link href={to > 0 ? `/admin/invites?page=${to}` : "/admin/invites"} className={`${cls} hover:border-border-strong hover:text-fg`}>
      {inner}
    </Link>
  );
}

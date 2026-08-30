"use client";

/*
  The ⋯ menu on a roster row: suspend / reactivate, promote / demote, send a
  password-reset email, and — behind a type-the-address confirmation — delete
  the account outright.

  Not built on `components/ui/row-menu` even though it looks like it: that
  component's contract is exactly two verbs (Edit, Delete) with an inline
  second-tap confirm, which is right for deleting one expense and wrong for
  three verbs, two of which want a modal and a stated reason. Same visual
  language, different job.

  Every item is guarded TWICE — the pure guard from `lib/admin/guards.ts` runs
  here to disable the item and show why, and again inside the Server Action
  before anything is written.
*/

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/icon";
import { describeCounts, totalRows } from "@/lib/admin/format";
import { canChangeRole, canChangeStatus, canDeleteUser } from "@/lib/admin/guards";
import type { AdminUserRow } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { deleteUserAccount, sendPasswordReset, setUserRole, setUserStatus } from "./actions";

type Verb = "status" | "role" | "reset" | "delete";

interface Props {
  row: AdminUserRow;
  actorId: string;
  adminCount: number;
  canWrite: boolean;
}

const itemCls =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function UserActions({ row, actorId, adminCount, canWrite }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Verb | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const nextStatus = row.status === "active" ? "suspended" : "active";
  const nextRole = row.role === "admin" ? "member" : "admin";

  const statusRefusal =
    (!canWrite && "Not available without a service-role key.") ||
    canChangeStatus({ actorId, targetId: row.id, next: nextStatus });
  const roleRefusal =
    (!canWrite && "Not available without a service-role key.") ||
    canChangeRole({ actorId, targetId: row.id, current: row.role, next: nextRole, adminCount });
  const resetRefusal = !canWrite ? "Not available without a service-role key." : null;
  const deleteRefusal =
    (!canWrite && "Not available without a service-role key.") ||
    canDeleteUser({ actorId, targetId: row.id, targetRole: row.role, adminCount });

  const run = (fn: () => Promise<{ ok: boolean; error: string | null }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "That didn't work.");
        return;
      }
      toast.success(success);
      setDialog(null);
      router.refresh();
    });

  const label = row.name ?? row.email;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-7 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-card-hover hover:text-fg"
      >
        <Icon name="MoreHorizontal" size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[13rem] overflow-hidden rounded-xl border border-border bg-card-solid p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={Boolean(statusRefusal)}
            title={statusRefusal || undefined}
            onClick={() => {
              setOpen(false);
              setDialog("status");
            }}
            className={cn(
              itemCls,
              row.status === "active"
                ? "text-fg-secondary hover:bg-card-hover hover:text-accent-rose"
                : "text-fg-secondary hover:bg-card-hover hover:text-fg",
            )}
          >
            <Icon name={row.status === "active" ? "UserX" : "UserCheck"} size={14} />
            {row.status === "active" ? "Suspend account" : "Reactivate account"}
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={Boolean(roleRefusal)}
            title={roleRefusal || undefined}
            onClick={() => {
              setOpen(false);
              setDialog("role");
            }}
            className={cn(itemCls, "text-fg-secondary hover:bg-card-hover hover:text-fg")}
          >
            <Icon name={row.role === "admin" ? "ShieldOff" : "ShieldCheck"} size={14} />
            {row.role === "admin" ? "Remove admin" : "Make admin"}
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={Boolean(resetRefusal)}
            title={resetRefusal || undefined}
            onClick={() => {
              setOpen(false);
              setDialog("reset");
            }}
            className={cn(itemCls, "text-fg-secondary hover:bg-card-hover hover:text-fg")}
          >
            <Icon name="KeyRound" size={14} />
            Send password reset
          </button>

          {/* The one item you cannot undo, fenced off from the three you can. */}
          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            role="menuitem"
            disabled={Boolean(deleteRefusal)}
            title={deleteRefusal || undefined}
            onClick={() => {
              setOpen(false);
              setDialog("delete");
            }}
            className={cn(itemCls, "text-accent-rose hover:bg-accent-rose/10")}
          >
            <Icon name="Trash2" size={14} />
            Delete account
          </button>
        </div>
      )}

      <ConfirmDialog
        open={dialog === "status"}
        tone={row.status === "active" ? "danger" : "default"}
        title={row.status === "active" ? `Suspend ${label}?` : `Reactivate ${label}?`}
        description={
          row.status === "active" ? (
            <>
              They will be signed out to a suspension notice the next time they open the app, and neither password nor
              Google sign-in will let them back in. Nothing they logged is deleted, and reactivating restores everything.
            </>
          ) : (
            <>They will be able to sign in again immediately, with all of their data exactly where they left it.</>
          )
        }
        confirmLabel={row.status === "active" ? "Suspend" : "Reactivate"}
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          run(
            () => setUserStatus(row.id, nextStatus),
            row.status === "active" ? `${label} suspended.` : `${label} reactivated.`,
          )
        }
      />

      <ConfirmDialog
        open={dialog === "role"}
        tone={row.role === "admin" ? "danger" : "default"}
        title={row.role === "admin" ? `Remove admin from ${label}?` : `Make ${label} an admin?`}
        description={
          row.role === "admin" ? (
            <>They lose access to this panel on their next request. Their own data is untouched.</>
          ) : (
            <>
              They will be able to see every account, suspend people and promote other admins. They still will not be
              able to read anybody&apos;s entries — this panel only ever shows counts.
            </>
          )
        }
        confirmLabel={row.role === "admin" ? "Remove admin" : "Make admin"}
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          run(
            () => setUserRole(row.id, nextRole),
            row.role === "admin" ? `${label} is now a member.` : `${label} is now an admin.`,
          )
        }
      />

      <ConfirmDialog
        open={dialog === "reset"}
        title={`Email a reset link to ${row.email}?`}
        description={
          <>
            Supabase sends the standard reset email. Their current password keeps working until they use the link, and
            you never see it.
          </>
        }
        confirmLabel="Send link"
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={() => run(() => sendPasswordReset(row.id), `Reset link sent to ${row.email}.`)}
      />

      {/* Delete. The counts come from the row already on screen — no extra read,
          and still numbers rather than anything they wrote. */}
      <ConfirmDialog
        open={dialog === "delete"}
        tone="danger"
        title={`Delete ${label}?`}
        description={
          <>
            This cannot be undone. There is no backup. Their account, their profile and every row they own go with
            it, and the same address can sign up again as a stranger.
          </>
        }
        requireText={row.email}
        requireHint={`Type ${row.email} to confirm`}
        confirmLabel={`Delete ${totalRows(row.counts)} rows`}
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={(typed) => run(() => deleteUserAccount(row.id, typed), `${label} deleted.`)}
      >
        <div className="rounded-xl border border-accent-rose/25 bg-accent-rose/5 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-accent-rose">About to be destroyed</div>
          <p className="mt-1 text-xs leading-relaxed text-fg-secondary">{describeCounts(row.counts)}</p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

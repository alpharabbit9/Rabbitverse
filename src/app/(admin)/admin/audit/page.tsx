import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireAdmin } from "@/lib/admin/guard";
import { pageRangeLabel, relativeDay } from "@/lib/admin/format";
import { AUDIT_PAGE_SIZE, type AuditRow } from "@/lib/admin/types";
import { getAuditLog } from "@/lib/data/admin";
import { currentDay } from "@/lib/session";

/*
  /admin/audit — every moderation write, oldest at the bottom.

  Read-only, and structurally so: `admin_audit_log` has a select policy for
  admins and no insert, update or delete policy at all, so the trail can only be
  appended to by the service role inside a Server Action. An admin cannot erase
  their own history from in here.

  The emails shown are the denormalised copies stored on each row, which is why
  a deleted account still reads as a person rather than a null.
*/

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const ACTION_COPY: Record<string, { label: string; icon: string; accent: string }> = {
  "user.status.set": { label: "Status changed", icon: "UserX", accent: "var(--accent-rose)" },
  "user.role.set": { label: "Role changed", icon: "ShieldCheck", accent: "var(--accent-gold)" },
  "user.password_reset": { label: "Password reset sent", icon: "KeyRound", accent: "var(--accent-blue)" },
  "user.delete": { label: "Account deleted", icon: "Trash2", accent: "var(--accent-rose)" },
  // Written only when the delete itself failed after the row above was logged —
  // so the trail never claims a deletion that did not happen.
  "user.delete_failed": { label: "Deletion failed", icon: "TriangleAlert", accent: "var(--accent-orange)" },
  "signup_mode.set": { label: "Sign-ups changed", icon: "Globe", accent: "var(--accent-cyan)" },
  "invite.create": { label: "Invite created", icon: "Ticket", accent: "var(--accent-mint)" },
  "invite.revoke": { label: "Invite revoked", icon: "Ticket", accent: "var(--fg-muted)" },
};

/** `{"from":"member","to":"admin"}` → `member → admin`. Shape-facts only, so this is safe to print. */
function describeDetail(detail: Record<string, unknown>): string | null {
  const from = detail.from;
  const to = detail.to;
  if (typeof from === "string" && typeof to === "string") return `${from} → ${to}`;
  const entries = Object.entries(detail);
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ");
}

function Entry({ row, today }: { row: AuditRow; today: string }) {
  const meta = ACTION_COPY[row.action] ?? { label: row.action, icon: "Activity", accent: "var(--fg-muted)" };
  const detail = describeDetail(row.detail);
  const day = row.createdAt.slice(0, 10);
  const time = row.createdAt.slice(11, 16);

  return (
    <li className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-card-hover">
        <Icon name={meta.icon} size={15} style={{ color: meta.accent }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium">{meta.label}</span>
          {detail && <span className="text-xs text-fg-secondary">{detail}</span>}
        </div>
        <div className="mt-0.5 truncate text-xs text-fg-muted">
          {row.targetEmail ?? "—"} · by {row.actorEmail ?? "a deleted admin"}
        </div>
      </div>
      <div className="shrink-0 text-right text-[11px] text-fg-muted">
        <div>{day ? relativeDay(day, today) : "—"}</div>
        <div className="tabular-nums">{time} UTC</div>
      </div>
    </li>
  );
}

export default async function AuditPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(0, Number.parseInt(raw ?? "", 10) || 0);
  const offset = page * AUDIT_PAGE_SIZE;

  const [log, today] = await Promise.all([getAuditLog(offset, AUDIT_PAGE_SIZE), currentDay()]);
  const lastPage = Math.max(0, Math.ceil(log.total / AUDIT_PAGE_SIZE) - 1);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Audit</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Every moderation action, with who did it. Append-only — not even an admin can edit this.
        </p>
      </header>

      <section className="glass overflow-hidden rounded-2xl">
        {log.rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-fg-muted">
            Nothing has been moderated yet. Suspending or promoting somebody will show up here.
          </p>
        ) : (
          <ul>
            {log.rows.map((row) => (
              <Entry key={row.id} row={row} today={today} />
            ))}
          </ul>
        )}

        {log.total > AUDIT_PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-fg-muted">
            <span>{pageRangeLabel(log.total, offset, log.rows.length)}</span>
            <div className="flex items-center gap-2">
              <PageLink to={page - 1} disabled={page <= 0} label="Prev" icon="ChevronLeft" />
              <PageLink to={page + 1} disabled={page >= lastPage} label="Next" icon="ChevronRight" trailing />
            </div>
          </div>
        )}
      </section>
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
  if (disabled) {
    return <span className={`${cls} opacity-40`}>{trailing ? <>{label} <Icon name={icon} size={13} /></> : <><Icon name={icon} size={13} /> {label}</>}</span>;
  }
  return (
    <Link href={to > 0 ? `/admin/audit?page=${to}` : "/admin/audit"} className={`${cls} hover:border-border-strong hover:text-fg`}>
      {trailing ? (
        <>
          {label} <Icon name={icon} size={13} />
        </>
      ) : (
        <>
          <Icon name={icon} size={13} /> {label}
        </>
      )}
    </Link>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { describeLastActive, pageRangeLabel, sortRowsBy, totalRows } from "@/lib/admin/format";
import { ROLE_COPY, STATUS_COPY } from "@/lib/admin/roles";
import {
  ADMIN_PAGE_SIZE,
  COUNT_COLUMNS,
  ROSTER_SORT_KEYS,
  type AdminUserRow,
  type RosterSortKey,
  type SortDir,
  type SortKey,
} from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserActions } from "./user-actions";

/*
  The roster.

  TWO SORTS, ON PURPOSE. Roster columns (email, name, status, role, joined) are
  sorted by Postgres and travel in the URL, so they order every user you have.
  Count columns and "last active" cannot be — `admin_user_stats` would have to
  count ten tables for every account in the database to order twenty-five rows —
  so those sort the current page only, and the header says so out loud rather
  than quietly lying about it.

  Ten count columns is a lot of table, so only four are shown until you ask for
  the rest. Everything scrolls sideways inside its own container; the page body
  never does.
*/

interface Props {
  rows: AdminUserRow[];
  total: number;
  offset: number;
  search: string;
  sort: RosterSortKey;
  dir: SortDir;
  /** Today in the admin's own timezone — what "3 days ago" is measured from. */
  today: string;
  /** The signed-in admin, so the row menu can refuse self-suspension. */
  actorId: string;
  /** Active admins in total, so the row menu can refuse the last-admin demote. */
  adminCount: number;
  canWrite: boolean;
}

const ROSTER_LABELS: Record<RosterSortKey, string> = {
  email: "User",
  name: "Name",
  status: "Status",
  role: "Role",
  created_at: "Joined",
};

function isRosterKey(key: SortKey): key is RosterSortKey {
  return (ROSTER_SORT_KEYS as readonly string[]).includes(key);
}

function joinedLabel(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

function Chip({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: accent, backgroundColor: "color-mix(in srgb, currentColor 14%, transparent)" }}
    >
      {label}
    </span>
  );
}

function SortCaret({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <Icon name="ArrowUpDown" size={11} className="opacity-25" />;
  return <Icon name={dir === "asc" ? "ArrowUp" : "ArrowDown"} size={11} />;
}

export function UsersTable({
  rows,
  total,
  offset,
  search,
  sort,
  dir,
  today,
  actorId,
  adminCount,
  canWrite,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(search);
  const [showAllCounts, setShowAllCounts] = useState(false);
  // Non-null only while a count / last-active column is driving the order.
  const [pageSort, setPageSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

  const columns = useMemo(
    () => (showAllCounts ? COUNT_COLUMNS : COUNT_COLUMNS.filter((c) => c.primary)),
    [showAllCounts],
  );

  const visible = useMemo(
    () => (pageSort ? sortRowsBy(rows, pageSort.key, pageSort.dir) : rows),
    [rows, pageSort],
  );

  const href = (next: Partial<{ q: string; sort: RosterSortKey; dir: SortDir; page: number }>) => {
    const params = new URLSearchParams();
    const q = next.q ?? search;
    const s = next.sort ?? sort;
    const d = next.dir ?? dir;
    const page = next.page ?? Math.floor(offset / ADMIN_PAGE_SIZE);
    if (q) params.set("q", q);
    if (s !== "created_at") params.set("sort", s);
    if (d !== "desc") params.set("dir", d);
    if (page > 0) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  const go = (url: string) => startTransition(() => router.push(url));

  /** A roster header re-queries the database; a count header just reorders here. */
  const onSort = (key: SortKey) => {
    if (isRosterKey(key)) {
      setPageSort(null);
      const nextDir: SortDir = sort === key && dir === "desc" ? "asc" : "desc";
      go(href({ sort: key, dir: nextDir, page: 0 }));
      return;
    }
    setPageSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  };

  const headerCls =
    "sticky top-0 z-10 select-none whitespace-nowrap bg-card-solid px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted";

  // A column header is a button, but it has to sit flush in the <th> — hence a
  // hairline halo and a face with no padding of its own.
  const sortBtn = "[--rv-pad:2px] -m-0.5";
  const sortFace = "gap-1 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

  const page = Math.floor(offset / ADMIN_PAGE_SIZE);
  const lastPage = Math.max(0, Math.ceil(total / ADMIN_PAGE_SIZE) - 1);

  return (
    <section className="glass overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(href({ q: query.trim(), page: 0 }));
          }}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card-hover/60 px-3 py-2"
        >
          <Icon name="Search" size={15} className="shrink-0 text-fg-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email or name"
            aria-label="Search users"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              hue="rose"
              onClick={() => {
                setQuery("");
                go(href({ q: "", page: 0 }));
              }}
              aria-label="Clear search"
            >
              <Icon name="X" size={14} />
            </Button>
          )}
        </form>

        <Button size="sm" selected={showAllCounts} onClick={() => setShowAllCounts((v) => !v)} faceClassName="px-3 py-2 text-xs font-medium">
          {showAllCounts ? "Fewer columns" : "All ten counts"}
        </Button>
      </div>

      <div className={cn("overflow-x-auto transition-opacity", pending && "opacity-60")}>
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {(["email", "status", "role", "created_at"] as RosterSortKey[]).map((key) => (
                <th key={key} scope="col" className={headerCls}>
                  <Button variant="ghost" size="sm" onClick={() => onSort(key)} className={sortBtn} faceClassName={sortFace}>
                    {ROSTER_LABELS[key]}
                    <SortCaret active={!pageSort && sort === key} dir={dir} />
                  </Button>
                </th>
              ))}

              <th scope="col" className={headerCls}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort("last_active")}
                  title="Sorts this page only"
                  className={sortBtn}
                  faceClassName={sortFace}
                >
                  Last active
                  <SortCaret active={pageSort?.key === "last_active"} dir={pageSort?.dir ?? "desc"} />
                </Button>
              </th>

              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn(headerCls, "text-right")} title={`${c.title} · sorts this page only`}>
                  <Button variant="ghost" size="sm" onClick={() => onSort(c.key)} className={cn(sortBtn, "ml-auto")} faceClassName={sortFace}>
                    {c.label}
                    <SortCaret active={pageSort?.key === c.key} dir={pageSort?.dir ?? "desc"} />
                  </Button>
                </th>
              ))}

              <th scope="col" className={cn(headerCls, "text-right")} title="Every row this account owns · sorts this page only">
                <Button variant="ghost" size="sm" onClick={() => onSort("total")} className={cn(sortBtn, "ml-auto")} faceClassName={sortFace}>
                  Rows
                  <SortCaret active={pageSort?.key === "total"} dir={pageSort?.dir ?? "desc"} />
                </Button>
              </th>

              <th scope="col" className={cn(headerCls, "w-10 text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length + 7} className="px-3 py-10 text-center text-sm text-fg-muted">
                  {search ? `Nobody matches “${search}”.` : "No accounts yet."}
                </td>
              </tr>
            )}

            {visible.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-card-hover/50">
                <td className="max-w-[18rem] px-3 py-2.5">
                  <div className="truncate font-medium">{row.name ?? "—"}</div>
                  <div className="truncate text-xs text-fg-muted">{row.email}</div>
                </td>
                <td className="px-3 py-2.5">
                  <Chip label={STATUS_COPY[row.status].label} accent={STATUS_COPY[row.status].accent} />
                </td>
                <td className="px-3 py-2.5">
                  <Chip label={ROLE_COPY[row.role].label} accent={ROLE_COPY[row.role].accent} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-fg-secondary">{joinedLabel(row.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-fg-secondary">
                  {describeLastActive(row.lastActive, today)}
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-3 py-2.5 text-right tabular-nums",
                      row.counts[c.key] === 0 ? "text-fg-muted/50" : "text-fg-secondary",
                    )}
                  >
                    {row.counts[c.key]}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">{totalRows(row.counts)}</td>
                <td className="px-2 py-2.5">
                  <UserActions row={row} actorId={actorId} adminCount={adminCount} canWrite={canWrite} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-fg-muted">
        <span>
          {pageRangeLabel(total, offset, visible.length)}
          {pageSort && <span className="ml-2 text-fg-muted/80">· sorted on this page only</span>}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={page <= 0} onClick={() => go(href({ page: page - 1 }))} faceClassName="gap-1 px-2.5 py-1.5">
            <Icon name="ChevronLeft" size={13} /> Prev
          </Button>
          <Button size="sm" disabled={page >= lastPage} onClick={() => go(href({ page: page + 1 }))} faceClassName="gap-1 px-2.5 py-1.5">
            Next <Icon name="ChevronRight" size={13} />
          </Button>
        </div>
      </div>
    </section>
  );
}

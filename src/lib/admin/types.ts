/*
  The shapes the admin panel deals in.

  Deliberately count-shaped. `AdminUserRow` has ten numbers and no strings a user
  wrote: no journal body, no expense note, no project description. The panel
  cannot render what it has no field for, and the RPC behind it cannot return
  what its signature has no column for (`0007_admin.sql`).

  Pure types + tables of constants — no React, no Supabase, no env. Safe to
  import from a client component.
*/

export type UserRole = "member" | "admin";
export type UserStatus = "active" | "suspended";
export type SignupMode = "open" | "invite" | "closed";

/** The per-user row counts, one per content table. */
export interface AdminCounts {
  expenses: number;
  categories: number;
  projects: number;
  tasks: number;
  commits: number;
  workouts: number;
  planDays: number;
  bodyMetrics: number;
  journal: number;
  devices: number;
}

/**
 * The count columns, in display order.
 *
 * `column` is the snake_case name the RPC returns. The read layer maps rows by
 * walking this table rather than by naming tables itself — which is what lets
 * `read-surface.test.ts` assert that `lib/data/admin.ts` never mentions a
 * content table at all.
 *
 * `primary: true` marks the four that earn a column on a phone.
 *
 * `noun` is the [singular, plural] the delete confirmation counts in — "1 expense",
 * "142 expenses" — so that modal reads like a sentence instead of a header row.
 */
export const COUNT_COLUMNS: {
  key: keyof AdminCounts;
  column: string;
  label: string;
  title: string;
  noun: [string, string];
  primary?: boolean;
}[] = [
  { key: "expenses", column: "n_expenses", label: "Exp", title: "Expenses logged", noun: ["expense", "expenses"], primary: true },
  { key: "journal", column: "n_journal_entries", label: "Jrnl", title: "Journal entries", noun: ["journal entry", "journal entries"], primary: true },
  { key: "workouts", column: "n_workout_logs", label: "Wkt", title: "Workout logs", noun: ["workout log", "workout logs"], primary: true },
  { key: "projects", column: "n_projects", label: "Proj", title: "Projects", noun: ["project", "projects"], primary: true },
  { key: "commits", column: "n_project_logs", label: "Cmt", title: "Project updates (commits)", noun: ["project update", "project updates"] },
  { key: "tasks", column: "n_project_tasks", label: "Task", title: "Project milestones", noun: ["milestone", "milestones"] },
  { key: "categories", column: "n_expense_categories", label: "Cat", title: "Spend categories", noun: ["spend category", "spend categories"] },
  { key: "planDays", column: "n_workout_plan_days", label: "Plan", title: "Workout plan days", noun: ["plan day", "plan days"] },
  { key: "bodyMetrics", column: "n_body_metrics", label: "Body", title: "Weight / body-fat entries", noun: ["body measurement", "body measurements"] },
  { key: "devices", column: "n_push_subscriptions", label: "Dev", title: "Push-subscribed devices", noun: ["subscribed device", "subscribed devices"] },
];

export const EMPTY_COUNTS: AdminCounts = {
  expenses: 0,
  categories: 0,
  projects: 0,
  tasks: 0,
  commits: 0,
  workouts: 0,
  planDays: 0,
  bodyMetrics: 0,
  journal: 0,
  devices: 0,
};

export interface AdminUserRow {
  id: string;
  email: string;
  /** Display name, or null when the profile has none. */
  name: string | null;
  status: UserStatus;
  role: UserRole;
  /** ISO timestamp of the roster row. */
  createdAt: string;
  /** ISO day (UTC) of their most recent write, or null if they never wrote. */
  lastActive: string | null;
  counts: AdminCounts;
}

export interface AdminOverview {
  totalUsers: number;
  admins: number;
  suspended: number;
  new7d: number;
  new30d: number;
  liveInvites: number;
  signupMode: SignupMode;
}

export interface AuditRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetId: string | null;
  targetEmail: string | null;
  /** Shape-facts only, e.g. {"from":"member","to":"admin"}. Never user content. */
  detail: Record<string, unknown>;
  createdAt: string;
}

/**
 * An invite: a code somebody types, an address that is admitted however it signs
 * up, or both. `uses` counts redemptions; `revoked_at` is how one is withdrawn,
 * because deleting it would take the redemption history with it.
 */
export interface Invite {
  id: string;
  /** Printed form, `RV-XXXX-XXXX`. Stored case-insensitively. */
  code: string;
  /** Bound address, or null for a code anybody may use. */
  email: string | null;
  maxUses: number;
  uses: number;
  /** ISO timestamp, or null for an invite that never expires. */
  expiresAt: string | null;
  revokedAt: string | null;
  /** The admin's own note to themselves. Never shown to the invitee. */
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** Why an invite can or cannot admit somebody right now. */
export type InviteStatus = "live" | "revoked" | "expired" | "used";

/** How many invites one page holds. */
export const INVITE_PAGE_SIZE = 50;

/**
 * The columns the RPC will sort by. A count cannot be sorted before it is
 * counted, so count columns are sorted client-side over the current page only —
 * see `sortRowsBy` in `format.ts`.
 */
export const ROSTER_SORT_KEYS = ["created_at", "email", "name", "status", "role"] as const;
export type RosterSortKey = (typeof ROSTER_SORT_KEYS)[number];

/** Keys only the client can sort: derived or count columns. */
export type ClientSortKey = keyof AdminCounts | "total" | "last_active";
export type SortKey = RosterSortKey | ClientSortKey;
export type SortDir = "asc" | "desc";

/** How many users one roster page holds. */
export const ADMIN_PAGE_SIZE = 25;
/** How many audit rows one page holds. */
export const AUDIT_PAGE_SIZE = 50;

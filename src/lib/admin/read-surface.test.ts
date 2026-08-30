import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
  The counts-only guarantee, as a test.

  Four independent things stop a journal entry reaching /admin:

    1. RLS on every content table is `auth.uid() = user_id`, and the admin's
       cookie client is just another user;
    2. the admin read layer only ever calls two RPCs whose return signatures are
       bigint columns;
    3. the service-role client is used by one file, which only writes;
    4. this test.

  It is blunt on purpose — it reads the read layer as TEXT and fails if a content
  table is so much as named in it, comments included. That fits the repo's rule
  that only pure logic gets unit tests: there is no database here, just a string.

  If this fails, do not add the table name to the allow-list. Ask why the admin
  panel wants to read somebody's rows.
*/

const source = readFileSync(fileURLToPath(new URL("../data/admin.ts", import.meta.url)), "utf8");

/** Every table that holds something a user typed or logged. */
const CONTENT_TABLES = [
  "expenses",
  "expense_categories",
  "projects",
  "project_tasks",
  "project_logs",
  "workout_logs",
  "workout_plan_days",
  "body_metrics",
  "journal_entries",
  "push_subscriptions",
  "user_profiles",
];

describe("lib/data/admin.ts read surface", () => {
  it.each(CONTENT_TABLES)("never mentions %s", (table) => {
    expect(source).not.toContain(table);
  });

  it("queries nothing but the trail and the invite list directly", () => {
    // Both are admin-owned tables with a select policy of `is_admin()` and no
    // write policy at all. Neither holds anything a user typed about their life.
    const tables = [...source.matchAll(/\.from\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
    expect(new Set(tables)).toEqual(new Set(["admin_audit_log", "invites"]));
  });

  it("calls only the two guarded admin RPCs", () => {
    const rpcs = [...source.matchAll(/\.rpc\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
    expect(new Set(rpcs)).toEqual(new Set(["admin_overview", "admin_user_stats"]));
  });

  it("never selects a whole row", () => {
    expect(source).not.toMatch(/select\(\s*["'`]\*/);
  });
});

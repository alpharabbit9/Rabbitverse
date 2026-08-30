-- Rabbit Verse — admin panel foundation (V4.0 Part 1, Phase A)
--
-- `public.users` has carried a `role` column since 0004 and nothing has ever
-- read it. This migration turns that unused column into an owner surface:
--
--   * is_admin()          — the one predicate every admin path asks.
--   * app_settings        — a deny-all singleton holding the signup mode.
--   * signup_mode()       — readable by anon, so a signed-out /signup can ask.
--   * admin_audit_log     — written by the service role only.
--   * admin_user_stats()  — the roster + per-user row COUNTS.
--   * admin_overview()    — the numbers at the top of the panel.
--
-- COUNTS ONLY. Both admin RPCs `returns table (... bigint ...)`: their return
-- signature is structurally incapable of carrying a journal sentence, an expense
-- note or a project description. That is the whole point of putting the admin's
-- reads on RPCs called with the *anon* cookie key rather than on the service
-- role — one slipped `select("*")` on a service-role client would leak content;
-- here there is nothing to slip.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor or `supabase db push`.

-- ---------------------------------------------------------------------------
-- 1. is_admin() — the predicate
-- ---------------------------------------------------------------------------
-- `security definer` is required, not convenient: `public.users` has only a
-- select-own policy (0004), so a caller cannot read anybody else's row — not
-- even to answer "is this uuid an admin?".
--
-- A SUSPENDED ADMIN IS NOT AN ADMIN. That is deliberate. Suspension is the
-- account-level off switch; if it did not also revoke admin powers, suspending a
-- compromised owner account would leave the panel open to it. Please do not
-- "fix" this.

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.users u
    where u.id = uid and u.role = 'admin' and u.status = 'active'
  );
$fn$;

comment on function public.is_admin(uuid) is
  'True only for an ACTIVE admin. Suspension revokes admin powers by design.';

revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. app_settings — the singleton
-- ---------------------------------------------------------------------------
-- One row, forever: `id boolean primary key default true check (id)` makes a
-- second row impossible to insert rather than merely discouraged.

create table if not exists public.app_settings (
  id          boolean primary key default true check (id),
  signup_mode text not null default 'open' check (signup_mode in ('open', 'invite', 'closed')),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users (id) on delete set null
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

-- RLS on with NO POLICIES AT ALL = deny-all for anon and authenticated. The
-- service role bypasses RLS and is the only writer. Readers go through
-- `signup_mode()` below, which returns one word.
alter table public.app_settings enable row level security;

-- ---------------------------------------------------------------------------
-- 3. signup_mode() — the one word /signup is allowed to ask for
-- ---------------------------------------------------------------------------
-- `coalesce(..., 'open')` is a safety property, not tidiness: if the settings
-- row is ever missing this FAILS OPEN. A signup gate that fails *closed* on an
-- empty table would lock every future user out with no way back in from inside
-- the app.

create or replace function public.signup_mode()
returns text
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce((select s.signup_mode from public.app_settings s where s.id), 'open');
$fn$;

comment on function public.signup_mode() is
  'Current signup mode (open|invite|closed). Fails OPEN when unset. Safe for anon: returns one word.';

grant execute on function public.signup_mode() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. admin_audit_log — what the owner did, and to whom
-- ---------------------------------------------------------------------------
-- The emails are DENORMALISED COPIES on purpose. Both id columns are
-- `on delete set null`, so after an account is deleted the row would otherwise
-- read "somebody did something to somebody". `actor_email` / `target_email`
-- keep it legible. Do not "clean up" that redundancy.
--
-- `detail` holds shape-facts only — {"from":"member","to":"admin"} — never user
-- content. Nothing in the app writes anything else into it.
--
-- Action vocabulary (free text, so later phases need no migration):
--   user.status.set · user.role.set · user.password_reset ·
--   user.delete (Phase C) · signup_mode.set · invite.create · invite.revoke (Phase D)

create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.users (id) on delete set null,
  actor_email  citext,
  action       text not null,
  target_id    uuid references public.users (id) on delete set null,
  target_email citext,
  detail       jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists idx_admin_audit_created on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

-- Admins may READ the trail. There is deliberately NO insert, update or delete
-- policy: only the service role writes, so an admin cannot erase their own
-- trail from inside the app.
drop policy if exists "admins read audit" on public.admin_audit_log;
create policy "admins read audit" on public.admin_audit_log
  for select using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Indexes the per-user counts need
-- ---------------------------------------------------------------------------
-- `admin_user_stats` counts ten tables for each of 25 users. Without a user_id
-- index that is 250 sequential scans; with one it is 250 index lookups.
--
-- Already covered, so deliberately NOT recreated here:
--   expenses, project_logs, workout_logs, journal_entries — (user_id, date) composites from 0001
--   workout_plan_days, body_metrics                       — unique (user_id, ...) constraints from 0001

create index if not exists idx_expense_categories_user on public.expense_categories (user_id);
create index if not exists idx_projects_user           on public.projects (user_id);
create index if not exists idx_project_tasks_user      on public.project_tasks (user_id);
create index if not exists idx_push_subs_user          on public.push_subscriptions (user_id);
create index if not exists idx_users_created           on public.users (created_at desc);

-- ---------------------------------------------------------------------------
-- 6. admin_user_stats() — the roster page
-- ---------------------------------------------------------------------------
-- One call returns one page of users, each with ten bigint counts, a last-active
-- day, and the total number of matches so the caller can paginate.
--
-- SORTING IS RESTRICTED TO ROSTER COLUMNS. A count cannot be sorted before it is
-- counted, and counting every table for every user in order to order 25 rows
-- would not scale. The UI sorts count columns client-side and says so.
-- The whitelist is also why there is no dynamic SQL here: the order-by is a
-- fixed CASE ladder, so `p_sort` never reaches the planner as text.

create or replace function public.admin_user_stats(
  p_search text default null,
  p_sort   text default 'created_at',
  p_dir    text default 'desc',
  p_limit  int default 25,
  p_offset int default 0
)
returns table (
  id                   uuid,
  email                citext,
  name                 text,
  status               text,
  role                 text,
  created_at           timestamptz,
  last_active          date,
  n_expenses           bigint,
  n_expense_categories bigint,
  n_projects           bigint,
  n_project_tasks      bigint,
  n_project_logs       bigint,
  n_workout_logs       bigint,
  n_workout_plan_days  bigint,
  n_body_metrics       bigint,
  n_journal_entries    bigint,
  n_push_subscriptions bigint,
  match_count          bigint
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
declare
  v_limit  int  := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int  := greatest(coalesce(p_offset, 0), 0);
  v_dir    text := case when lower(coalesce(p_dir, 'desc')) = 'asc' then 'asc' else 'desc' end;
  v_sort   text := lower(coalesce(p_sort, 'created_at'));
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_sort not in ('created_at', 'email', 'name', 'status', 'role') then
    v_sort := 'created_at';
  end if;

  return query
  with base as (
    select u.id, u.email, p.display_name as name, u.status, u.role, u.created_at
    from public.users u
    left join public.user_profiles p on p.id = u.id
    where v_search is null
       or u.email ilike '%' || v_search || '%'
       or coalesce(p.display_name, '') ilike '%' || v_search || '%'
  ),
  counted as (select count(*)::bigint as match_count from base),
  page as (
    select b.*
    from base b
    order by
      case when v_dir = 'asc'  and v_sort = 'email'      then b.email end asc  nulls last,
      case when v_dir = 'desc' and v_sort = 'email'      then b.email end desc nulls last,
      case when v_dir = 'asc'  and v_sort = 'name'       then b.name end asc  nulls last,
      case when v_dir = 'desc' and v_sort = 'name'       then b.name end desc nulls last,
      case when v_dir = 'asc'  and v_sort = 'status'     then b.status end asc  nulls last,
      case when v_dir = 'desc' and v_sort = 'status'     then b.status end desc nulls last,
      case when v_dir = 'asc'  and v_sort = 'role'       then b.role end asc  nulls last,
      case when v_dir = 'desc' and v_sort = 'role'       then b.role end desc nulls last,
      case when v_dir = 'asc'  and v_sort = 'created_at' then b.created_at end asc  nulls last,
      case when v_dir = 'desc' and v_sort = 'created_at' then b.created_at end desc nulls last,
      b.id
    limit v_limit offset v_offset
  )
  select
    r.id,
    r.email,
    r.name,
    r.status,
    r.role,
    r.created_at,
    -- Last active = the most recent thing they actually DID, as a UTC calendar
    -- day. Taken from `created_at` (when the row was written) rather than the
    -- user-chosen log date, which can be backdated to yesterday.
    -- `push_subscriptions` is excluded: a device re-registering itself is not
    -- the person doing anything. `expense_categories`, `workout_plan_days` and
    -- `body_metrics` have no `created_at` to read.
    (
      select max(t.at)::date from (
        select max(x.created_at) as at from public.expenses       x where x.user_id = r.id
        union all
        select max(x.created_at)      from public.projects        x where x.user_id = r.id
        union all
        select max(x.created_at)      from public.project_logs    x where x.user_id = r.id
        union all
        select max(x.created_at)      from public.project_tasks   x where x.user_id = r.id
        union all
        select max(x.created_at)      from public.workout_logs    x where x.user_id = r.id
        union all
        select max(x.created_at)      from public.journal_entries x where x.user_id = r.id
      ) t
    ) as last_active,
    (select count(*) from public.expenses           c where c.user_id = r.id) as n_expenses,
    (select count(*) from public.expense_categories c where c.user_id = r.id) as n_expense_categories,
    (select count(*) from public.projects           c where c.user_id = r.id) as n_projects,
    (select count(*) from public.project_tasks      c where c.user_id = r.id) as n_project_tasks,
    (select count(*) from public.project_logs       c where c.user_id = r.id) as n_project_logs,
    (select count(*) from public.workout_logs       c where c.user_id = r.id) as n_workout_logs,
    (select count(*) from public.workout_plan_days  c where c.user_id = r.id) as n_workout_plan_days,
    (select count(*) from public.body_metrics       c where c.user_id = r.id) as n_body_metrics,
    (select count(*) from public.journal_entries    c where c.user_id = r.id) as n_journal_entries,
    (select count(*) from public.push_subscriptions c where c.user_id = r.id) as n_push_subscriptions,
    counted.match_count
  from page r cross join counted;
end $fn$;

comment on function public.admin_user_stats(text, text, text, int, int) is
  'One page of the user roster with per-user row COUNTS. Admin-only; raises not_authorized otherwise.';

revoke execute on function public.admin_user_stats(text, text, text, int, int) from public;
grant execute on function public.admin_user_stats(text, text, text, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. admin_overview() — the numbers, plus the current signup mode
-- ---------------------------------------------------------------------------
-- `admins` doubles as the input to the last-admin guard: the moderation actions
-- refuse to demote or delete the final active admin.

create or replace function public.admin_overview()
returns table (
  total_users  bigint,
  admins       bigint,
  suspended    bigint,
  new_7d       bigint,
  new_30d      bigint,
  live_invites bigint,
  signup_mode  text
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
#variable_conflict use_column
declare
  v_live_invites bigint := 0;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- `invites` arrives in Phase D. Asking the catalog first means this function
  -- is correct both before and after that migration, instead of quietly
  -- reporting zero forever if somebody forgets to come back and edit it.
  if to_regclass('public.invites') is not null then
    execute $q$
      select count(*)::bigint from public.invites i
      where i.revoked_at is null
        and (i.expires_at is null or i.expires_at > now())
        and i.uses < i.max_uses
    $q$ into v_live_invites;
  end if;

  return query
  select
    (select count(*)::bigint from public.users),
    (select count(*)::bigint from public.users u where u.role = 'admin' and u.status = 'active'),
    (select count(*)::bigint from public.users u where u.status = 'suspended'),
    (select count(*)::bigint from public.users u where u.created_at >= now() - interval '7 days'),
    (select count(*)::bigint from public.users u where u.created_at >= now() - interval '30 days'),
    v_live_invites,
    public.signup_mode();
end $fn$;

comment on function public.admin_overview() is
  'Roster totals + the current signup mode. Admin-only; raises not_authorized otherwise.';

revoke execute on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- Bootstrapping the first admin
-- ---------------------------------------------------------------------------
-- Deliberately NOT done here: a migration must not hard-code somebody's email.
-- Run this once, by hand, in the Supabase SQL editor (also in SUPABASE_SETUP.md):
--
--   update public.users set role = 'admin' where email = 'you@example.com';
--
-- Note the SQL editor runs as `postgres`, so `auth.uid()` is null there and the
-- two admin RPCs raise `not_authorized` if you call them from it. Test the panel
-- through the app.

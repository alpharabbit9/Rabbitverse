-- Rabbit Verse — multi-user foundation (V3.0 Phase B1)
--
-- Turns the single-user app into a multi-tenant one. Data isolation already
-- worked (0001 put `auth.uid() = user_id` RLS on every table); what this adds is
-- the identity surface around it:
--
--   * `public.users`         — the queryable roster (auth.users is unreachable
--                              under the anon key), carrying status + role.
--   * `public.user_profiles` — the renamed `profiles`, gaining per-user
--                              timezone / currency / locale / mascot.
--   * `handle_new_user()`    — rewritten so a signup writes both tables inside
--                              the signup transaction.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor or `supabase db push`.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- 1. public.users — the roster
-- ---------------------------------------------------------------------------
-- Supabase owns identity in `auth.users` (email, provider, password hash) and
-- that table cannot be replaced or read under the anon key. This sits beside it
-- and holds only what the *app* needs to ask about a user.

create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      citext not null unique,
  status     text not null default 'active' check (status in ('active', 'suspended')),
  role       text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. profiles -> user_profiles, plus the per-user locale columns
-- ---------------------------------------------------------------------------
-- A rename (not a new table) so existing rows, the primary key, every foreign
-- key and the "own profile" policy all survive untouched.

do $rename$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles')
     and not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'user_profiles')
  then
    alter table public.profiles rename to user_profiles;
  end if;
end $rename$;

create table if not exists public.user_profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  height_cm    numeric,
  settings     jsonb not null default '{"reminderTime":"21:00"}',
  created_at   timestamptz not null default now()
);

-- New columns. `timezone` and `currency` were previously buried in the settings
-- JSONB default and never read; as real columns they can be selected in one
-- round-trip by `lib/session.ts` and guarded by a check constraint.
alter table public.user_profiles add column if not exists avatar_url text;
alter table public.user_profiles add column if not exists mascot   text not null default 'rabbit';
alter table public.user_profiles add column if not exists timezone text not null default 'Asia/Dhaka';
alter table public.user_profiles add column if not exists currency text not null default 'BDT';
alter table public.user_profiles add column if not exists locale   text not null default 'en';

-- Shape guards only — an IANA zone list cannot be validated in SQL, so the real
-- check is `isValidTimeZone()` server-side. These stop obvious junk.
do $guards$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_currency_shape') then
    alter table public.user_profiles
      add constraint user_profiles_currency_shape check (currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_timezone_shape') then
    alter table public.user_profiles
      add constraint user_profiles_timezone_shape check (length(timezone) between 1 and 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_locale_shape') then
    alter table public.user_profiles
      add constraint user_profiles_locale_shape check (length(locale) between 2 and 35);
  end if;
end $guards$;

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;

-- The renamed table carries 0001's "own profile" policy across the rename, but
-- recreate it so a fresh database that has never had `profiles` is covered too.
drop policy if exists "own profile" on public.user_profiles;
create policy "own profile" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Read-only to its owner, deliberately. `status` and `role` are moderation
-- fields: with no insert/update/delete policy, RLS denies all three for `anon`
-- and `authenticated`, so a suspended user cannot un-suspend themselves. The
-- service role bypasses RLS and is the only way to change them.
drop policy if exists "own user row" on public.users;
create policy "own user row" on public.users
  for select using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 4. Backfill from auth.users (the accounts that predate this migration)
-- ---------------------------------------------------------------------------

insert into public.users (id, email, created_at)
select u.id, u.email, coalesce(u.created_at, now())
from auth.users u
where u.email is not null
on conflict (id) do nothing;

insert into public.user_profiles (id, display_name)
select u.id,
       coalesce(
         nullif(u.raw_user_meta_data ->> 'name', ''),
         nullif(u.raw_user_meta_data ->> 'full_name', ''),
         split_part(coalesce(u.email, ''), '@', 1)
       )
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. On sign-up: roster row + profile (hard), then the seeds (soft)
-- ---------------------------------------------------------------------------
-- This is an `after insert on auth.users ... for each row` trigger, so it
-- already runs *inside* the signup transaction: if it raises, the auth.users
-- insert rolls back with it and no orphan account survives. That is exactly the
-- atomicity we want for `users` + `user_profiles` — an account without a profile
-- is broken and should never exist.
--
-- The category and plan seeds are only nice-to-have, so they sit in their own
-- exception block: a seed hiccup must never cost somebody their account.
-- `seedProfileDefaults()` (settings/actions.ts) backfills them on next load.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $fn$
declare
  fallback_name text := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
begin
  -- Hard: these two must succeed or the signup rolls back.
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    fallback_name,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do nothing;

  -- Soft: seeds are recoverable, so never let them abort a signup.
  begin
    insert into public.expense_categories (user_id, name, color, icon, is_preset) values
      (new.id, 'Food', 'var(--accent-mint)', 'Utensils', true),
      (new.id, 'Transport', 'var(--accent-blue)', 'Bus', true),
      (new.id, 'Shopping', 'var(--accent-purple)', 'ShoppingBag', true),
      (new.id, 'Bills', 'var(--accent-gold)', 'ReceiptText', true),
      (new.id, 'Health', 'var(--accent-orange)', 'HeartPulse', true),
      (new.id, 'Other', 'var(--accent-cyan)', 'Sparkles', true);

    insert into public.workout_plan_days (user_id, weekday, label, focus) values
      (new.id, 0, 'Push', 'Chest · Shoulders · Triceps'),
      (new.id, 1, 'Pull', 'Back · Biceps'),
      (new.id, 2, 'Legs', 'Quads · Hamstrings · Calves'),
      (new.id, 3, 'Rest', 'Mobility & stretching'),
      (new.id, 4, 'Upper', 'Chest · Back'),
      (new.id, 5, 'Cardio', 'Run · Core'),
      (new.id, 6, 'Rest', 'Recovery walk')
    on conflict (user_id, weekday) do nothing;
  exception
    when others then null;
  end;

  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

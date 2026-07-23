-- Rabbit Verse — initial schema
-- Single-user app: every row is scoped to the owner via user_id + RLS.
-- Run this in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  height_cm    numeric,
  settings     jsonb not null default '{"currency":"BDT","timezone":"Asia/Dhaka","reminderTime":"21:00"}',
  created_at   timestamptz not null default now()
);

create table if not exists public.expense_categories (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  name      text not null,
  color     text not null default 'var(--accent-cyan)',
  icon      text not null default 'Sparkles',
  is_preset boolean not null default false
);

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  spent_at    date not null,
  amount      numeric not null check (amount >= 0),
  category_id uuid references public.expense_categories (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  description  text,
  target_value numeric not null default 100,
  target_unit  text not null default '%',
  current_value numeric not null default 0,
  status       text not null default 'ongoing' check (status in ('ongoing','completed')),
  start_date   date not null default current_date,
  target_date  date,
  created_at   timestamptz not null default now()
);

create table if not exists public.project_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  log_date        date not null,
  progress_amount numeric not null default 0,
  note            text,
  created_at      timestamptz not null default now(),
  unique (project_id, log_date)
);

create table if not exists public.workout_plan_days (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  label   text not null,
  focus   text,
  unique (user_id, weekday)
);

create table if not exists public.workout_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  log_date   date not null,
  done       boolean not null default true,
  plan_label text,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.body_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  log_date     date not null,
  weight_kg    numeric,
  body_fat_pct numeric,
  unique (user_id, log_date)
);

create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  mood       int not null check (mood between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes for date-range queries
create index if not exists idx_expenses_user_date on public.expenses (user_id, spent_at);
create index if not exists idx_project_logs_user_date on public.project_logs (user_id, log_date);
create index if not exists idx_workout_logs_user_date on public.workout_logs (user_id, log_date);
create index if not exists idx_journal_user_date on public.journal_entries (user_id, entry_date);

-- ---------------------------------------------------------------------------
-- Row Level Security — each user sees only their own rows
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','expense_categories','expenses','projects','project_logs',
    'workout_plan_days','workout_logs','body_metrics','journal_entries','push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- profiles keyed by id; everything else by user_id
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'expense_categories','expenses','projects','project_logs',
    'workout_plan_days','workout_logs','body_metrics','journal_entries','push_subscriptions'
  ] loop
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- On sign-up: create a profile + seed default categories and a 7-day plan
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Rifat'));

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
    (new.id, 6, 'Rest', 'Recovery walk');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

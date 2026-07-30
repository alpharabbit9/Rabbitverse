-- Rabbit Verse — richer project tracking (additive to 0001)
-- Adds: a long-form "goals / vision" field on projects, and a task/milestone
-- checklist. Progress for a project that has tasks is derived from the checklist
-- (done ÷ total) and written back into projects.current_value as a percent, so
-- every existing read path (life-score, cards, goals view) keeps working.
--
-- project_logs is intentionally left one-row-per-project-per-day: each written
-- update ("commit") upserts that day's row, so the count of rows == the number
-- of distinct days worked on the project.

-- 1. Goals / vision on projects ---------------------------------------------
alter table public.projects add column if not exists goals text;

-- 2. Task / milestone checklist ---------------------------------------------
create table if not exists public.project_tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  position   int not null default 0,
  done_at    date,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_tasks_project on public.project_tasks (project_id, position);

-- 3. Row Level Security — owner-only, same shape as every other table --------
alter table public.project_tasks enable row level security;
drop policy if exists "own rows" on public.project_tasks;
create policy "own rows" on public.project_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Rabbit Verse — editable & deletable logs (V3.0 Phase F)
--
-- What F needs from the database: the ability to UPDATE and DELETE a user's own
-- expenses, journal entries and project updates, and to remove a project along
-- with everything under it.
--
-- The good news — and the reason this migration is short — is that 0001 already
-- provides all of it:
--
--   * RLS is `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`
--     on every user-scoped table. `for all` is SELECT + INSERT + UPDATE + DELETE,
--     so owners can already edit and delete their own rows; no new policy is
--     required. (The plan predated confirming 0001 used one `for all` policy
--     rather than a per-command set.)
--   * `project_logs.project_id` and `project_tasks.project_id` are both
--     `references public.projects (id) on delete cascade`, so deleting a project
--     already removes its updates and checklist with it.
--
-- So this file adds nothing the app strictly needs. It is kept for two reasons:
-- to hold the migration number the build order reserved for F (keeping the
-- sequence contiguous after 0004), and to make the "your rows are yours to edit
-- and delete" guarantee explicit and re-assertable on a fresh database. The
-- policy re-creation below is idempotent and equivalent to 0001's loop — running
-- it changes nothing on an existing database.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor or `supabase db push`.

do $editable$
declare t text;
begin
  -- The three tables F exposes an Edit/Delete affordance for, plus `projects`
  -- (rename + delete). Re-assert the owner-only "own rows" policy so a database
  -- that somehow lost it still permits the owner to update and delete.
  foreach t in array array['expenses', 'journal_entries', 'project_logs', 'projects'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own rows" on public.%I;', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $editable$;

-- Defensive: guarantee the cascade that makes `deleteProject` clean. These are
-- already `on delete cascade` in 0001/0002; re-declaring is a no-op there, and a
-- safety net on any database that predates those definitions.
do $cascade$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'project_logs_project_id_fkey' and confdeltype <> 'c'
  ) then
    alter table public.project_logs drop constraint project_logs_project_id_fkey;
    alter table public.project_logs
      add constraint project_logs_project_id_fkey
      foreign key (project_id) references public.projects (id) on delete cascade;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'project_tasks_project_id_fkey' and confdeltype <> 'c'
  ) then
    alter table public.project_tasks drop constraint project_tasks_project_id_fkey;
    alter table public.project_tasks
      add constraint project_tasks_project_id_fkey
      foreign key (project_id) references public.projects (id) on delete cascade;
  end if;
end $cascade$;

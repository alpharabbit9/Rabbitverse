-- Rabbit Verse — AI Project Blueprint (Create New Project page)
--
-- The /projects/new flow turns one free-form description into a structured
-- blueprint (idea, key features, problems) plus an ordered milestone list, then
-- writes the whole thing in one go. This migration gives that flow somewhere to
-- land:
--
--   1. projects.logo_url / idea / key_features / problems  — the blueprint.
--   2. project_tasks.status                                — planned | in_progress | completed.
--   3. a trigger keeping `status` and the legacy `done` flag in agreement.
--   4. a `project-logos` storage bucket, owner-writable, public-readable.
--
-- Additive and idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Blueprint columns on projects
-- ---------------------------------------------------------------------------
-- `description` (0001) stays the one-line card subtitle and `goals` stays the
-- long-form brief the user typed. `idea` is the AI's distilled one-paragraph
-- version of it — deliberately a separate column, because regenerating the
-- blueprint must never destroy what the user wrote.
alter table public.projects add column if not exists logo_url text;
alter table public.projects add column if not exists idea text;
alter table public.projects add column if not exists key_features text[] not null default '{}';
alter table public.projects add column if not exists problems text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- 2. Milestone status
-- ---------------------------------------------------------------------------
-- `done` has driven progress since 0002 and every existing read path still uses
-- it (recomputeProgress, the ring, life-score). `status` is the richer three-way
-- the Create Project page edits; the trigger below makes them one fact stored
-- twice rather than two facts that can disagree.
alter table public.project_tasks add column if not exists status text not null default 'planned';
alter table public.project_tasks drop constraint if exists project_tasks_status_check;
alter table public.project_tasks
  add constraint project_tasks_status_check check (status in ('planned','in_progress','completed'));

-- Backfill: anything already ticked is completed.
update public.project_tasks set status = 'completed' where done and status <> 'completed';

create or replace function public.sync_task_status()
returns trigger
language plpgsql
as $fn$
begin
  if tg_op = 'INSERT' then
    if new.status = 'completed' then
      new.done := true;
    elsif new.done then
      new.status := 'completed';
    end if;
    return new;
  end if;

  -- On UPDATE, whichever side actually moved wins. `done` is checked first so
  -- the pre-existing toggleTask/completeMilestones actions — which write only
  -- `done` — keep behaving exactly as they did.
  if new.done is distinct from old.done then
    if new.done then
      new.status := 'completed';
    elsif new.status = 'completed' then
      new.status := 'planned';
    end if;
  elsif new.status is distinct from old.status then
    new.done := (new.status = 'completed');
  end if;
  return new;
end;
$fn$;

drop trigger if exists sync_task_status on public.project_tasks;
create trigger sync_task_status
  before insert or update on public.project_tasks
  for each row execute function public.sync_task_status();

-- ---------------------------------------------------------------------------
-- 3. Project logo storage
-- ---------------------------------------------------------------------------
-- Public-read so a logo can be rendered from a plain <img> without signing every
-- URL; writes are fenced to `{auth.uid()}/…`, so nobody can overwrite or delete
-- somebody else's file. 2 MB cap, images only — enforced by the bucket itself so
-- a hand-rolled client can't sneak a 40 MB upload past the browser-side check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-logos',
  'project-logos',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project logos are readable" on storage.objects;
create policy "project logos are readable" on storage.objects
  for select using (bucket_id = 'project-logos');

drop policy if exists "own project logo insert" on storage.objects;
create policy "own project logo insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own project logo update" on storage.objects;
create policy "own project logo update" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'project-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own project logo delete" on storage.objects;
create policy "own project logo delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 0006_project_planner.sql
-- Phase H: AI Project Planner — status widening, tags, richer milestones.
-- Additive and idempotent; safe to re-run.

-- 1. Status: add 'planned' to the allowed set (was 'ongoing'|'completed').
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check check (status in ('planned','ongoing','completed'));

-- 2. Tags — a per-project free/preset label set. Array keeps it join-free.
alter table public.projects add column if not exists tags text[] not null default '{}';

-- 3. Richer milestones — a one-line detail and where the milestone came from.
alter table public.project_tasks add column if not exists detail text;
alter table public.project_tasks add column if not exists source text not null default 'manual'
  check (source in ('manual','ai'));

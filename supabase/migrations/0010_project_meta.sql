-- 0010_project_meta.sql
-- Project Details bento rebuild: a Category and a Type for the header card, plus
-- a repair for 0009's `problems` column.
-- Additive and idempotent; safe to re-run.

-- 1. Category / Type — two free-text labels shown in the detail header's meta
--    strip and set in the Create Project flow. Nullable: existing projects and
--    the quick-add path leave them empty, and the header omits what is absent.
alter table public.projects add column if not exists category text;
alter table public.projects add column if not exists "type" text;

-- 2. Repair 0009. That migration split the `problems` column across a newline
--    (`prob` / `lems`), which is invalid SQL — so on any database where 0009 ran,
--    the column never got created and every blueprint write silently dropped its
--    problems. Re-add it here (idempotent) so the read path has a column to load.
alter table public.projects add column if not exists problems text[] not null default '{}';

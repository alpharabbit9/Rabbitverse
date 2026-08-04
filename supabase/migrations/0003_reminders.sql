-- Rabbit Verse — reminders scheduling (Phase 6)
-- Schedules the send-reminders Edge Function to run every minute via pg_cron +
-- pg_net. The function itself decides who is "due" (Dhaka-local reminder time ==
-- current minute), so this job just pokes it once a minute.
--
-- ⚠️ EDIT BEFORE RUNNING: replace <PROJECT_REF> and <CRON_SECRET> below. The
-- CRON_SECRET must match the CRON_SECRET function secret you set with
-- `supabase secrets set CRON_SECRET=...`. Do not commit real secrets.
--
-- Run this in the Supabase SQL editor.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helpful index for the fan-out read the function does.
create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

-- Remove a previous copy of the job if re-running this migration.
select cron.unschedule('rabbitverse-send-reminders')
where exists (select 1 from cron.job where jobname = 'rabbitverse-send-reminders');

-- Every minute: POST to the Edge Function with the shared secret header.
select cron.schedule(
  'rabbitverse-send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

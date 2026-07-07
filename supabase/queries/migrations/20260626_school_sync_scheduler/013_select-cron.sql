-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 13 of 14

-- 05:10 KST on the first day of every month. pg_cron uses UTC.
select cron.schedule(
  'start-monthly-school-sync',
  '10 20 1 * *',
  $$ select public.start_school_sync(); $$
);

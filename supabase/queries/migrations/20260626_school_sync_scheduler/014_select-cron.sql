-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 14 of 14

select cron.schedule(
  'advance-school-sync',
  '* * * * *',
  $$ select public.advance_school_sync(); $$
);

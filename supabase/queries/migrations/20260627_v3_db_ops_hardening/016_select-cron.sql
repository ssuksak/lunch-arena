-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 16 of 16

select cron.schedule(
  'refresh-recent-monthly-rollups',
  '50 18 * * *',
  $$select public.refresh_recent_monthly_rollups(2);$$
);

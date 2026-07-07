-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 14 of 16

select cron.schedule(
  'cleanup-old-meals-90d',
  '40 18 * * *',
  $$select public.cleanup_old_meals(90, 5000, false);$$
);

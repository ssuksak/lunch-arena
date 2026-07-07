-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 13 of 16

-- pg_cron job names are stable so re-running the migration remains idempotent.
do $$
begin
  perform cron.unschedule('cleanup-old-meals-90d');
exception
  when others then null;
end $$;

-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 15 of 16

do $$
begin
  perform cron.unschedule('refresh-recent-monthly-rollups');
exception
  when others then null;
end $$;

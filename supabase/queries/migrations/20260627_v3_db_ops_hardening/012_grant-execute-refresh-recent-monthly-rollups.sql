-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 12 of 16

grant execute on function public.refresh_recent_monthly_rollups(integer)
  to postgres, service_role;

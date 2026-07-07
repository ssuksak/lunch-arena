-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 11 of 16

revoke execute on function public.refresh_recent_monthly_rollups(integer)
  from public, anon, authenticated;

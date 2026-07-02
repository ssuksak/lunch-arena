-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 8 of 16

revoke execute on function public.cleanup_old_meals(integer, integer, boolean)
  from public, anon, authenticated;

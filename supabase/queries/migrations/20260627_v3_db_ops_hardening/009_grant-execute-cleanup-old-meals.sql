-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 9 of 16

grant execute on function public.cleanup_old_meals(integer, integer, boolean)
  to postgres, service_role;

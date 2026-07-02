-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 8 of 19

revoke execute on function public.refresh_school_monthly_rollup_for_school(date, bigint) from public, anon, authenticated;

-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 46 of 49

revoke execute on function public.refresh_school_monthly_rollups(date) from public, anon, authenticated;

-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 10 of 19

revoke execute on function public.trg_refresh_monthly_rollups_from_rating() from public, anon, authenticated;

-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 7 of 49

revoke execute on function public.fill_rating_meal_snapshot() from public, anon, authenticated;

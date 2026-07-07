-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 1 of 19

-- v3 retention foundation and live monthly rollups.
-- Applied to production Supabase on 2026-06-27.

alter table public.ratings
  drop constraint if exists ratings_meal_id_fkey;

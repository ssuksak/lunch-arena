-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 3 of 19

alter table public.battles
  drop constraint if exists battles_meal_a_id_fkey;

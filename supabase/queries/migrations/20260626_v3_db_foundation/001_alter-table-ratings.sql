-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 1 of 49

-- v3 DB foundation: keep reviews usable after old meal retention and prepare monthly rollups.
-- Applied to production Supabase on 2026-06-26.

alter table public.ratings
  add column if not exists meal_date_snapshot date,
  add column if not exists meal_type_snapshot text,
  add column if not exists meal_menu_snapshot jsonb;

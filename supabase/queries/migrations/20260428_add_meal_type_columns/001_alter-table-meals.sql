-- Source: migrations/20260428_add_meal_type_columns.sql

-- Statement: 1 of 8

-- Prepare meals for breakfast/lunch/dinner display.
-- This is backward-compatible with the existing sync-meals Edge Function.

alter table public.meals
  add column if not exists meal_type text not null default 'lunch',
  add column if not exists meal_type_label text not null default '중식',
  add column if not exists neis_meal_code text;

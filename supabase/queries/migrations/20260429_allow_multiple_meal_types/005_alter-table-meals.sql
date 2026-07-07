-- Source: migrations/20260429_allow_multiple_meal_types.sql

-- Statement: 5 of 9

alter table public.meals
  drop constraint if exists meals_school_id_meal_date_key;

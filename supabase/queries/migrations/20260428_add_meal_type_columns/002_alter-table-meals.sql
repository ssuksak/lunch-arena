-- Source: migrations/20260428_add_meal_type_columns.sql

-- Statement: 2 of 8

alter table public.meals
  drop constraint if exists meals_meal_type_check;

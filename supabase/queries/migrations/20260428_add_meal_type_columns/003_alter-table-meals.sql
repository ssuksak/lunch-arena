-- Source: migrations/20260428_add_meal_type_columns.sql

-- Statement: 3 of 8

alter table public.meals
  add constraint meals_meal_type_check
  check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other'));

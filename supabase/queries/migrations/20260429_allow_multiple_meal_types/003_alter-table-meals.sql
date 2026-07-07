-- Source: migrations/20260429_allow_multiple_meal_types.sql

-- Statement: 3 of 9

alter table public.meals
  add constraint meals_meal_type_check
  check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other'));

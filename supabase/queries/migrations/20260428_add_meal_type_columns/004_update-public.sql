-- Source: migrations/20260428_add_meal_type_columns.sql

-- Statement: 4 of 8

update public.meals
set meal_type = 'lunch', meal_type_label = '중식'
where meal_type is null or meal_type_label is null;

-- Source: migrations/20260429_allow_multiple_meal_types.sql

-- Statement: 1 of 9

-- Allow one school/date to store multiple meal services, such as lunch and dinner.
-- The application treats lunch as the default meal for rankings and battles.

alter table public.meals
  add column if not exists meal_type text not null default 'lunch',
  add column if not exists meal_type_label text not null default '중식',
  add column if not exists neis_meal_code text;

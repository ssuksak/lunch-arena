-- Source: migrations/20260429_allow_multiple_meal_types.sql

-- Statement: 4 of 9

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.meals'::regclass
      and conname = 'meals_school_id_meal_date_meal_type_key'
  ) then
    alter table public.meals
      add constraint meals_school_id_meal_date_meal_type_key
      unique (school_id, meal_date, meal_type);
  end if;
end $$;

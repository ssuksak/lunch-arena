-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 6 of 49

create or replace function public.fill_rating_meal_snapshot()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.meal_id is not null and
     (new.meal_date_snapshot is null or new.meal_type_snapshot is null or new.meal_menu_snapshot is null) then
    select m.meal_date, m.meal_type_label, m.menu
      into new.meal_date_snapshot, new.meal_type_snapshot, new.meal_menu_snapshot
    from public.meals m
    where m.id = new.meal_id;
  end if;

  return new;
end;
$$;

-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 5 of 49

update public.ratings r
set meal_date_snapshot = coalesce(r.meal_date_snapshot, m.meal_date),
    meal_type_snapshot = coalesce(r.meal_type_snapshot, m.meal_type_label),
    meal_menu_snapshot = coalesce(r.meal_menu_snapshot, m.menu)
from public.meals m
where r.meal_id = m.id
  and (r.meal_date_snapshot is null or r.meal_type_snapshot is null or r.meal_menu_snapshot is null);

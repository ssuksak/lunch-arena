-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 9 of 49

create trigger trg_fill_rating_meal_snapshot
before insert or update of meal_id, meal_date_snapshot, meal_type_snapshot, meal_menu_snapshot
on public.ratings
for each row execute function public.fill_rating_meal_snapshot();

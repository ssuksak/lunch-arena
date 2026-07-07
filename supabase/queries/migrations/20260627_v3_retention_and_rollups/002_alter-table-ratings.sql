-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 2 of 19

alter table public.ratings
  add constraint ratings_meal_id_fkey
  foreign key (meal_id) references public.meals(id) on delete set null;

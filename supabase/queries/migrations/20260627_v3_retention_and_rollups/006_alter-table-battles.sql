-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 6 of 19

alter table public.battles
  add constraint battles_meal_b_id_fkey
  foreign key (meal_b_id) references public.meals(id) on delete set null;

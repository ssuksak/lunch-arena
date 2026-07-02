-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 18 of 49

create index if not exists idx_battles_meal_b_id
  on public.battles(meal_b_id);

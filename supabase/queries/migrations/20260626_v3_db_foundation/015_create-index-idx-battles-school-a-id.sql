-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 15 of 49

create index if not exists idx_battles_school_a_id
  on public.battles(school_a_id);

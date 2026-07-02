-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 22 of 49

create index if not exists idx_daily_rankings_school_id
  on public.daily_rankings(school_id);

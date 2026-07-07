-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 21 of 49

create index if not exists idx_school_stats_school_id
  on public.school_stats(school_id);

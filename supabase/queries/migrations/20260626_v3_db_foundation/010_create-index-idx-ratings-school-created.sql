-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 10 of 49

create index if not exists idx_ratings_school_created
  on public.ratings(school_id, created_at desc);

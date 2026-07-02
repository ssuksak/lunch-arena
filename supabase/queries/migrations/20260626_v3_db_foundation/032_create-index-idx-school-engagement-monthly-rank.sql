-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 32 of 49

create index if not exists idx_school_engagement_monthly_rank
  on public.school_engagement_monthly(month, score desc, review_count desc);

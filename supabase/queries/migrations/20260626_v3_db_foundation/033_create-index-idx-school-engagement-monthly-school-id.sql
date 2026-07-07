-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 33 of 49

create index if not exists idx_school_engagement_monthly_school_id
  on public.school_engagement_monthly(school_id);

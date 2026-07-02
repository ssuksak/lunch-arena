-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 44 of 49

create index if not exists idx_school_menu_stats_monthly_school_id
  on public.school_menu_stats_monthly(school_id);

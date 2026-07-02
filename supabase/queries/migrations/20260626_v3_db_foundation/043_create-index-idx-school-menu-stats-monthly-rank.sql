-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 43 of 49

create index if not exists idx_school_menu_stats_monthly_rank
  on public.school_menu_stats_monthly(month, school_id, pick_count desc, avg_score desc);

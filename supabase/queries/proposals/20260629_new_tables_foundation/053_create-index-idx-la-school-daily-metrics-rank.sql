-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 53 of 134

create index if not exists idx_la_school_daily_metrics_rank on public.la_school_daily_metrics(metric_date, point_total desc, review_count desc);

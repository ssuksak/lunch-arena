-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 18 of 134

create table if not exists public.la_school_daily_metrics (
  metric_date date not null,
  school_id bigint not null references public.schools(id) on delete cascade,
  review_count integer not null default 0,
  comment_count integer not null default 0,
  reaction_count integer not null default 0,
  photo_count integer not null default 0,
  active_user_count integer not null default 0,
  point_total integer not null default 0,
  avg_score numeric(4,2),
  top_menu_item text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (metric_date, school_id)
);

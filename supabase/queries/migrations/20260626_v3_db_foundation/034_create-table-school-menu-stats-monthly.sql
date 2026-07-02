-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 34 of 49

create table if not exists public.school_menu_stats_monthly (
  month date not null,
  school_id bigint not null references public.schools(id) on delete cascade,
  menu_item text not null,
  pick_count integer not null default 0,
  avg_score numeric(4,2),
  photo_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (month, school_id, menu_item)
);

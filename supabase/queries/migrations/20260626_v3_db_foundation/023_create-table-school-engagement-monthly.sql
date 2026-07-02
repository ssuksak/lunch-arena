-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 23 of 49

create table if not exists public.school_engagement_monthly (
  month date not null,
  school_id bigint not null references public.schools(id) on delete cascade,
  review_count integer not null default 0,
  comment_count integer not null default 0,
  reaction_count integer not null default 0,
  photo_count integer not null default 0,
  score integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (month, school_id)
);

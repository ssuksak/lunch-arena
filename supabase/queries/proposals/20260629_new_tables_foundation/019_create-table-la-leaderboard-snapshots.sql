-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 19 of 134

create table if not exists public.la_leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  leaderboard_type text not null,
  period_start date not null,
  period_end date not null,
  scope text not null default 'global',
  school_id bigint not null references public.schools(id) on delete cascade,
  rank integer not null check (rank > 0),
  score numeric(12,4) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (leaderboard_type, period_start, period_end, scope, school_id),
  check (period_end >= period_start)
);

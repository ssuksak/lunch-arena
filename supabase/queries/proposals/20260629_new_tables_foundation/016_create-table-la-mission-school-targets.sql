-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 16 of 134

create table if not exists public.la_mission_school_targets (
  mission_id uuid not null references public.la_missions(id) on delete cascade,
  school_id bigint not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (mission_id, school_id)
);

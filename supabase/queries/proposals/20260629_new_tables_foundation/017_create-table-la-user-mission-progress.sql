-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 17 of 134

create table if not exists public.la_user_mission_progress (
  mission_id uuid not null references public.la_missions(id) on delete cascade,
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  progress_count integer not null default 0 check (progress_count >= 0),
  completed_at timestamptz,
  rewarded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (mission_id, user_id)
);

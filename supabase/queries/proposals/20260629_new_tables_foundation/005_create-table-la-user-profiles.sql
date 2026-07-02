-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 5 of 134

create table if not exists public.la_user_profiles (
  user_id uuid primary key references public.la_users(id) on delete cascade,
  display_name text,
  selected_school_id bigint references public.schools(id) on delete set null,
  trust_score integer not null default 0 check (trust_score >= -1000 and trust_score <= 1000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

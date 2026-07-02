-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 6 of 134

create table if not exists public.la_user_school_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint not null references public.schools(id) on delete cascade,
  role text not null default 'unknown' check (role in ('student', 'alumni', 'parent', 'fan', 'unknown')),
  is_current boolean not null default true,
  source text not null default 'user_schools' check (source in ('user_schools', 'profile', 'admin', 'import')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_current = true and ended_at is null) or (is_current = false))
);

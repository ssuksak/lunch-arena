-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 15 of 134

create table if not exists public.la_missions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  mission_type text not null,
  scope text not null check (scope in ('global', 'school', 'user')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  target_count integer not null default 1 check (target_count > 0),
  reward_points integer not null default 0 check (reward_points >= 0),
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

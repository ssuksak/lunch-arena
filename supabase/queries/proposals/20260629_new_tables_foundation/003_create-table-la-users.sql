-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 3 of 134

create table if not exists public.la_users (
  id uuid primary key default gen_random_uuid(),
  primary_user_key text,
  status public.la_user_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

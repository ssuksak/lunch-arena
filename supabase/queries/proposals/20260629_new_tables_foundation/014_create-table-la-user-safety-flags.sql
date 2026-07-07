-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 14 of 134

create table if not exists public.la_user_safety_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  flag_type text not null,
  severity integer not null default 1 check (severity between 1 and 5),
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

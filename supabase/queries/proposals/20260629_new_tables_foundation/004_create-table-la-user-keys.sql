-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 4 of 134

create table if not exists public.la_user_keys (
  user_key text primary key,
  user_id uuid not null references public.la_users(id) on delete cascade,
  source text not null check (source in ('toss', 'fp', 'admin', 'system', 'legacy')),
  is_primary boolean not null default false,
  verified_at timestamptz,
  retired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'toss' and user_key ~ '^toss_[A-Za-z0-9_-]{8,128}$')
    or (source = 'fp' and user_key ~ '^fp_[A-Za-z0-9_-]{8,128}$')
    or (source in ('admin', 'system', 'legacy') and user_key ~ '^[A-Za-z0-9:_-]{3,160}$')
  )
);

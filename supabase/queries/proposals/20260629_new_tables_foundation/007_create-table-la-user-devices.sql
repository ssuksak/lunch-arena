-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 7 of 134

create table if not exists public.la_user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  device_key_hash text not null,
  source text not null check (source in ('toss', 'fp', 'admin', 'system', 'legacy')),
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_key_hash)
);

-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 21 of 134

create table if not exists public.la_app_config (
  key text primary key,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 20 of 134

create table if not exists public.la_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  attempt integer not null default 1 check (attempt > 0),
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

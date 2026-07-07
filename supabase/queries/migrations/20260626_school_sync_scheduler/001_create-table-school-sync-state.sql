-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 1 of 14

-- Monthly school master-data sync.
-- Keeps public.schools aligned with NEIS schoolInfo without deleting existing rows.

create table if not exists public.school_sync_state (
  id text primary key,
  region_codes text[] not null default array[
    'B10','C10','D10','E10','F10','G10','H10','I10','J10','K10','M10','N10','P10','Q10','R10','S10','T10'
  ],
  current_region_index integer not null default 1 check (current_region_index >= 1),
  current_page integer not null default 1 check (current_page >= 1),
  is_running boolean not null default false,
  total_inserted integer not null default 0,
  total_raw integer not null default 0,
  total_skipped integer not null default 0,
  last_request_id bigint,
  last_region_code text,
  last_page integer,
  last_result jsonb,
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

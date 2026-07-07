-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 9 of 134

create table if not exists public.la_user_point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  event_id uuid references public.la_activity_events(id) on delete set null,
  point_type text not null,
  points integer not null check (points <> 0),
  period_month date not null,
  idempotency_key text not null unique,
  reason text,
  created_at timestamptz not null default now(),
  check (period_month = date_trunc('month', period_month)::date)
);

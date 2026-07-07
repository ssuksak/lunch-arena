-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 12 of 134

create table if not exists public.la_moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.la_users(id) on delete set null,
  reporter_user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  target_type public.la_activity_target_type not null,
  target_id text not null,
  reason text not null,
  details text,
  status public.la_report_status not null default 'open',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

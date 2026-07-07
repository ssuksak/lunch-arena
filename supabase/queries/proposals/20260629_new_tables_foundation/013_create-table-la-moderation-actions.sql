-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 13 of 134

create table if not exists public.la_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.la_moderation_reports(id) on delete set null,
  moderator_key text,
  target_type public.la_activity_target_type not null,
  target_id text not null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

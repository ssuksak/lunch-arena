-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 8 of 134

create table if not exists public.la_activity_events (
  id uuid primary key default gen_random_uuid(),
  event_type public.la_activity_event_type not null,
  actor_user_id uuid references public.la_users(id) on delete set null,
  actor_user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  meal_id bigint references public.meals(id) on delete set null,
  rating_id bigint references public.ratings(id) on delete set null,
  target_type public.la_activity_target_type,
  target_id text,
  occurred_at timestamptz not null default now(),
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 10 of 134

create table if not exists public.la_feed_items (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid references public.la_activity_events(id) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  meal_id bigint references public.meals(id) on delete set null,
  rating_id bigint references public.ratings(id) on delete set null,
  feed_scope text not null check (feed_scope in ('global', 'school', 'meal')),
  title text,
  summary text,
  thumbnail_url text,
  rank_score numeric(12,4) not null default 0,
  visibility public.la_visibility not null default 'hidden',
  published_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

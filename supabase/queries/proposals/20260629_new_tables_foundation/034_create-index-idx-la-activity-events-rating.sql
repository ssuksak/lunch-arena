-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 34 of 134

create index if not exists idx_la_activity_events_rating on public.la_activity_events(rating_id);

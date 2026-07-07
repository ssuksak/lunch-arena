-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 31 of 134

create index if not exists idx_la_activity_events_actor_time on public.la_activity_events(actor_user_id, occurred_at desc);

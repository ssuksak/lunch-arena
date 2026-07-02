-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 32 of 134

create index if not exists idx_la_activity_events_actor_key_time on public.la_activity_events(actor_user_key, occurred_at desc);

-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 33 of 134

create index if not exists idx_la_activity_events_type_time on public.la_activity_events(event_type, occurred_at desc);

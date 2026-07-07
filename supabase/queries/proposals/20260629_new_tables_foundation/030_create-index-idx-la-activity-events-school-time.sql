-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 30 of 134

create index if not exists idx_la_activity_events_school_time on public.la_activity_events(school_id, occurred_at desc);

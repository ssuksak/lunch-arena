-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 23 of 134

create index if not exists idx_la_users_status_last_seen on public.la_users(status, last_seen_at desc);

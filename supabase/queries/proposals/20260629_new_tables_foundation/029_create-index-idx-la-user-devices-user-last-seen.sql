-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 29 of 134

create index if not exists idx_la_user_devices_user_last_seen on public.la_user_devices(user_id, last_seen_at desc);

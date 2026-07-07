-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 25 of 134

create index if not exists idx_la_user_keys_user_id on public.la_user_keys(user_id);

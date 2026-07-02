-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 49 of 134

create index if not exists idx_la_user_safety_flags_user_status on public.la_user_safety_flags(user_id, status);

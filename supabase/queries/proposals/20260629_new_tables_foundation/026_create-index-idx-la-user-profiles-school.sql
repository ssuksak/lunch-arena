-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 26 of 134

create index if not exists idx_la_user_profiles_school on public.la_user_profiles(selected_school_id);

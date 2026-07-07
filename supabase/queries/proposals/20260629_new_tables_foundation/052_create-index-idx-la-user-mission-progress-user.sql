-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 52 of 134

create index if not exists idx_la_user_mission_progress_user on public.la_user_mission_progress(user_id, updated_at desc);

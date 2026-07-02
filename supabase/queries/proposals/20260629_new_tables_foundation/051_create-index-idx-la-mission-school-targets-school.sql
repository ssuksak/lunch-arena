-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 51 of 134

create index if not exists idx_la_mission_school_targets_school on public.la_mission_school_targets(school_id);

-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 28 of 134

create index if not exists idx_la_user_school_memberships_school on public.la_user_school_memberships(school_id, is_current);

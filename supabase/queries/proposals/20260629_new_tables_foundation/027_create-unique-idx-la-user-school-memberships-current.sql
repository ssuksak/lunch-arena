-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 27 of 134

create unique index if not exists idx_la_user_school_memberships_current
  on public.la_user_school_memberships(user_id)
  where is_current = true;

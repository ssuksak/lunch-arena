-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 22 of 134

create unique index if not exists idx_la_users_primary_user_key
  on public.la_users(primary_user_key)
  where primary_user_key is not null;

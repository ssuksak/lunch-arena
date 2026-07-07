-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 24 of 134

create unique index if not exists idx_la_user_keys_one_primary
  on public.la_user_keys(user_id)
  where is_primary = true and retired_at is null;

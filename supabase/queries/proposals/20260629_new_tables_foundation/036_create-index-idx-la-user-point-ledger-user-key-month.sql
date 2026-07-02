-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 36 of 134

create index if not exists idx_la_user_point_ledger_user_key_month on public.la_user_point_ledger(user_key, period_month);

-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 35 of 134

create index if not exists idx_la_user_point_ledger_user_month on public.la_user_point_ledger(user_id, period_month);

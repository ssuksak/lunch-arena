-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 37 of 134

create index if not exists idx_la_user_point_ledger_school_month on public.la_user_point_ledger(school_id, period_month);

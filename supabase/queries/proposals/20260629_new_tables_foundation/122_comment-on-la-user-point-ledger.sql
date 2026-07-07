-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 122 of 134

comment on table public.la_user_point_ledger is 'Append-only user points ledger. Reversals use negative rows instead of updates.';

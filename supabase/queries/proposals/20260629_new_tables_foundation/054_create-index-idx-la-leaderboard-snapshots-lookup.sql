-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 54 of 134

create index if not exists idx_la_leaderboard_snapshots_lookup on public.la_leaderboard_snapshots(leaderboard_type, period_start, period_end, scope, rank);

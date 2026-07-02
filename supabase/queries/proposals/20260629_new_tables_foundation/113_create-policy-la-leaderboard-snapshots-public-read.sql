-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 113 of 134

create policy la_leaderboard_snapshots_public_read
  on public.la_leaderboard_snapshots
  for select
  to anon, authenticated
  using (true);

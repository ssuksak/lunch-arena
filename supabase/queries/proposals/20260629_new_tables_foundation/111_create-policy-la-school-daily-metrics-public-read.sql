-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 111 of 134

create policy la_school_daily_metrics_public_read
  on public.la_school_daily_metrics
  for select
  to anon, authenticated
  using (true);

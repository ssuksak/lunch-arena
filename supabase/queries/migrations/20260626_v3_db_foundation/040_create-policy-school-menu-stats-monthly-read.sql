-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 40 of 49

create policy school_menu_stats_monthly_read
  on public.school_menu_stats_monthly
  for select
  to anon, authenticated
  using (true);

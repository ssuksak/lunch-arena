-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 29 of 49

create policy school_engagement_monthly_read
  on public.school_engagement_monthly
  for select
  to anon, authenticated
  using (true);

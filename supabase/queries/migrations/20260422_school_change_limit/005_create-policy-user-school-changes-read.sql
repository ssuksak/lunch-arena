-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 5 of 15

create policy user_school_changes_read on public.user_school_changes
  for select to anon, authenticated using (true);

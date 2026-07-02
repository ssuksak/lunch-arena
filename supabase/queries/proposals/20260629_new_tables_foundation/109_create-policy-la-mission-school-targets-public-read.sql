-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 109 of 134

create policy la_mission_school_targets_public_read
  on public.la_mission_school_targets
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.la_missions m
      where m.id = mission_id
        and m.is_active = true
        and m.starts_at <= now()
        and (m.ends_at is null or m.ends_at > now())
    )
  );

-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 107 of 134

create policy la_missions_public_read
  on public.la_missions
  for select
  to anon, authenticated
  using (
    is_active = true
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 115 of 134

create policy la_app_config_public_read
  on public.la_app_config
  for select
  to anon, authenticated
  using (is_public = true);

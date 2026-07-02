-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 56 of 134

create index if not exists idx_la_app_config_public on public.la_app_config(key) where is_public = true;

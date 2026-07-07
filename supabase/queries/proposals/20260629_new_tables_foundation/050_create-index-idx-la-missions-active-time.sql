-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 50 of 134

create index if not exists idx_la_missions_active_time on public.la_missions(is_active, starts_at, ends_at);

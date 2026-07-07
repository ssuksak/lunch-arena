-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 44 of 134

create index if not exists idx_la_moderation_reports_status_created on public.la_moderation_reports(status, created_at desc);

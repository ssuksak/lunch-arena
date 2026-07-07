-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 45 of 134

create index if not exists idx_la_moderation_reports_target on public.la_moderation_reports(target_type, target_id);

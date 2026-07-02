-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 46 of 134

create unique index if not exists idx_la_moderation_reports_reporter_user_dedupe
  on public.la_moderation_reports(reporter_user_id, target_type, target_id, reason)
  where reporter_user_id is not null;

-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 47 of 134

create unique index if not exists idx_la_moderation_reports_reporter_key_dedupe
  on public.la_moderation_reports(reporter_user_key, target_type, target_id, reason)
  where reporter_user_id is null and reporter_user_key is not null;

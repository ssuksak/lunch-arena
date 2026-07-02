-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 48 of 134

create index if not exists idx_la_moderation_actions_target on public.la_moderation_actions(target_type, target_id, created_at desc);

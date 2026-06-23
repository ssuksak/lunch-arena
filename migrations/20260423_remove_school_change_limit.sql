-- Migration: remove school change limit
-- Purpose: allow users to change their own school freely.
-- Keep user_school_changes history for diagnostics, but stop blocking updates.

drop trigger if exists trg_enforce_school_change_limit on public.user_schools;
drop function if exists public.enforce_school_change_limit();

-- The client no longer needs public change-count reads when there is no limit.
drop function if exists public.get_school_change_status(text);
drop policy if exists user_school_changes_read on public.user_school_changes;

comment on table public.user_school_changes is '학교 변경 이력 (진단 및 분석용, 변경 제한 없음)';

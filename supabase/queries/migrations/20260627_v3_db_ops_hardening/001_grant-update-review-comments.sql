-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 1 of 16

-- v3 DB operations hardening.
-- Safe operational follow-up after the v3 UI/AIT deployment.

-- 1) Prepare comment edit/delete ownership policies.
-- The current app does not expose these controls yet, but adding the policy is
-- backward-compatible and lets the next UI change use the same owner-header
-- pattern as review edit/delete.
grant update (comment, nickname) on public.review_comments to anon, authenticated;

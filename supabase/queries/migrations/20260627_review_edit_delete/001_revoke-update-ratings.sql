-- Source: migrations/20260627_review_edit_delete.sql

-- Statement: 1 of 6

-- Allow users to edit/delete their own reviews through the public REST API.
-- Ownership is checked against the current Toss/webview user key sent in a
-- request header. This keeps the rollout compatible with the existing anon
-- client until v3 introduces a stronger server-side write path.

revoke update on public.ratings from anon, authenticated;

-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 3 of 16

drop policy if exists review_comments_update_own on public.review_comments;

-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 2 of 16

grant delete on public.review_comments to anon, authenticated;

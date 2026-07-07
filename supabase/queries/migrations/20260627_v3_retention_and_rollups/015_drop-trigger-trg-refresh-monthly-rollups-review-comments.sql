-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 15 of 19

drop trigger if exists trg_refresh_monthly_rollups_review_comments on public.review_comments;

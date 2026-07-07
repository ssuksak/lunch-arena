-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 17 of 19

drop trigger if exists trg_refresh_monthly_rollups_review_reactions on public.review_reactions;

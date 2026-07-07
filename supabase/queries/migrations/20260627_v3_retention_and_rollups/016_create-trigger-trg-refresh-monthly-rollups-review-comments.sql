-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 16 of 19

create trigger trg_refresh_monthly_rollups_review_comments
after insert or update or delete on public.review_comments
for each row execute function public.trg_refresh_monthly_rollups_from_child();

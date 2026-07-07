-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 14 of 19

create trigger trg_refresh_monthly_rollups_ratings
after insert or update or delete on public.ratings
for each row execute function public.trg_refresh_monthly_rollups_from_rating();

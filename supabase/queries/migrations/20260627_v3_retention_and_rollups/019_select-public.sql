-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 19 of 19

select public.refresh_school_monthly_rollups(date_trunc('month', current_date)::date);

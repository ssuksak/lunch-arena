-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 47 of 49

select public.refresh_school_monthly_rollups(date_trunc('month', current_date)::date);

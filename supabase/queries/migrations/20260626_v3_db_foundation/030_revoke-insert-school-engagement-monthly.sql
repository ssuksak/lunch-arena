-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 30 of 49

revoke insert, update, delete on public.school_engagement_monthly from anon, authenticated;

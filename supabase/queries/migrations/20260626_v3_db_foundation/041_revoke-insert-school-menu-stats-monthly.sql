-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 41 of 49

revoke insert, update, delete on public.school_menu_stats_monthly from anon, authenticated;

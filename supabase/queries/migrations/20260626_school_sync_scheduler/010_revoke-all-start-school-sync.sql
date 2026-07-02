-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 10 of 14

revoke all on function public.start_school_sync() from public, anon, authenticated;

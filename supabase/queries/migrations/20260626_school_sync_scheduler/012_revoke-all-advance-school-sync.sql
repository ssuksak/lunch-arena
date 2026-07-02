-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 12 of 14

revoke all on function public.advance_school_sync() from public, anon, authenticated;

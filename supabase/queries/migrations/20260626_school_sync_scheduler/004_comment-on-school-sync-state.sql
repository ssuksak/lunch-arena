-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 4 of 14

comment on table public.school_sync_state is 'NEIS schoolInfo monthly sync progress. One page is processed per cron tick.';

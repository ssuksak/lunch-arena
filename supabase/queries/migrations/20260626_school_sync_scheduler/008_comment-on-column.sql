-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 8 of 14

comment on column public.school_sync_state.total_skipped is 'Duplicate NEIS rows skipped before upsert by the current or most recent managed school sync run.';

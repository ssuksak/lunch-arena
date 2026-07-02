-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 7 of 14

comment on column public.school_sync_state.total_raw is 'Raw NEIS rows fetched by the current or most recent managed school sync run.';

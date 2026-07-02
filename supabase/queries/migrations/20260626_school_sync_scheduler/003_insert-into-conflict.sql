-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 3 of 14

insert into public.school_sync_state (id)
values ('school_sync')
on conflict (id) do nothing;

-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 9 of 14

create or replace function public.start_school_sync()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  update public.school_sync_state
  set
    current_region_index = 1,
    current_page = 1,
    is_running = true,
    total_inserted = 0,
    total_raw = 0,
    total_skipped = 0,
    last_request_id = null,
    last_region_code = null,
    last_page = null,
    last_result = null,
    last_error = null,
    started_at = now(),
    finished_at = null,
    updated_at = now()
  where id = 'school_sync';
end;
$$;

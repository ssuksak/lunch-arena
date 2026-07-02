-- Source: migrations/20260626_school_sync_scheduler.sql

-- Statement: 11 of 14

create or replace function public.advance_school_sync()
returns bigint
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  state public.school_sync_state%rowtype;
  atpt text;
  req_id bigint;
begin
  select * into state
  from public.school_sync_state
  where id = 'school_sync'
  for update;

  if not found or not state.is_running then
    return null;
  end if;

  atpt := state.region_codes[state.current_region_index];
  if atpt is null then
    update public.school_sync_state
    set is_running = false,
        finished_at = now(),
        updated_at = now(),
        last_error = 'No region code for current_region_index'
    where id = 'school_sync';
    return null;
  end if;

  select net.http_post(
    url := 'https://puwthqzbounohrdmacgo.supabase.co/functions/v1/sync-schools',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3RocXpib3Vub2hyZG1hY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjA2MzMsImV4cCI6MjA5MDg5NjYzM30.AxUjNNTnLv2xVNC_UMFE3o0x0-s_tFJnRcMr7mBNOy0',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3RocXpib3Vub2hyZG1hY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjA2MzMsImV4cCI6MjA5MDg5NjYzM30.AxUjNNTnLv2xVNC_UMFE3o0x0-s_tFJnRcMr7mBNOy0'
    ),
    body := jsonb_build_object(
      'atpt_code', atpt,
      'page', state.current_page,
      'managed', true
    ),
    timeout_milliseconds := 30000
  ) into req_id;

  update public.school_sync_state
  set last_request_id = req_id,
      last_region_code = atpt,
      last_page = state.current_page,
      updated_at = now()
  where id = 'school_sync';

  return req_id;
end;
$$;

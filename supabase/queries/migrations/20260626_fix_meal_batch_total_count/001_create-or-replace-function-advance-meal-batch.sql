-- Source: migrations/20260626_fix_meal_batch_total_count.sql

-- Statement: 1 of 2

-- Use the live schools count for weekly meal batch completion instead of a fixed 12000 cap.

create or replace function public.advance_meal_batch()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  state public.batch_state%rowtype;
  batch_size int := 50;
  payload text;
  req_id bigint;
  school_total int := 0;
begin
  select * into state
  from public.batch_state
  where id = 'meal_sync'
  for update;

  if not found or not state.is_running then
    return;
  end if;

  select count(*) into school_total from public.schools;

  payload := json_build_object(
    'offset', state.current_offset,
    'batch_size', batch_size,
    'date_from', state.date_from::text,
    'date_to', state.date_to::text
  )::text;

  select net.http_post(
    url := 'https://puwthqzbounohrdmacgo.supabase.co/functions/v1/batch-sync-meals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3RocXpib3Vub2hyZG1hY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjA2MzMsImV4cCI6MjA5MDg5NjYzM30.AxUjNNTnLv2xVNC_UMFE3o0x0-s_tFJnRcMr7mBNOy0',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3RocXpib3Vub2hyZG1hY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjA2MzMsImV4cCI6MjA5MDg5NjYzM30.AxUjNNTnLv2xVNC_UMFE3o0x0-s_tFJnRcMr7mBNOy0'
    ),
    body := payload::jsonb,
    timeout_milliseconds := 30000
  ) into req_id;

  update public.batch_state
  set current_offset = current_offset + batch_size,
      updated_at = now()
  where id = 'meal_sync';

  if state.current_offset + batch_size >= school_total then
    update public.batch_state
    set is_running = false,
        updated_at = now()
    where id = 'meal_sync';
  end if;
end;
$$;

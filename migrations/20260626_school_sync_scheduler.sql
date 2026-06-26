-- Monthly school master-data sync.
-- Keeps public.schools aligned with NEIS schoolInfo without deleting existing rows.

create table if not exists public.school_sync_state (
  id text primary key,
  region_codes text[] not null default array[
    'B10','C10','D10','E10','F10','G10','H10','I10','J10','K10','M10','N10','P10','Q10','R10','S10','T10'
  ],
  current_region_index integer not null default 1 check (current_region_index >= 1),
  current_page integer not null default 1 check (current_page >= 1),
  is_running boolean not null default false,
  total_inserted integer not null default 0,
  total_raw integer not null default 0,
  total_skipped integer not null default 0,
  last_request_id bigint,
  last_region_code text,
  last_page integer,
  last_result jsonb,
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.school_sync_state enable row level security;

insert into public.school_sync_state (id)
values ('school_sync')
on conflict (id) do nothing;

comment on table public.school_sync_state is 'NEIS schoolInfo monthly sync progress. One page is processed per cron tick.';
comment on column public.school_sync_state.region_codes is 'NEIS education office codes to sync in order.';
comment on column public.school_sync_state.total_inserted is 'Rows upserted by the current or most recent managed school sync run.';
comment on column public.school_sync_state.total_raw is 'Raw NEIS rows fetched by the current or most recent managed school sync run.';
comment on column public.school_sync_state.total_skipped is 'Duplicate NEIS rows skipped before upsert by the current or most recent managed school sync run.';

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

revoke all on function public.start_school_sync() from public, anon, authenticated;

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

revoke all on function public.advance_school_sync() from public, anon, authenticated;

-- 05:10 KST on the first day of every month. pg_cron uses UTC.
select cron.schedule(
  'start-monthly-school-sync',
  '10 20 1 * *',
  $$ select public.start_school_sync(); $$
);

select cron.schedule(
  'advance-school-sync',
  '* * * * *',
  $$ select public.advance_school_sync(); $$
);
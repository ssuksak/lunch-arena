-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 55 of 134

create index if not exists idx_la_job_runs_name_started on public.la_job_runs(job_name, started_at desc);

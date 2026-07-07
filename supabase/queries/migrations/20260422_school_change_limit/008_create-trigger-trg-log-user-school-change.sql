-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 8 of 15

create trigger trg_log_user_school_change
  after update on public.user_schools
  for each row execute function public.log_user_school_change();

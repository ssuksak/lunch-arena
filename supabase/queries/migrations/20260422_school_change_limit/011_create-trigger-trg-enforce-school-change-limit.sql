-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 11 of 15

create trigger trg_enforce_school_change_limit
  before update on public.user_schools
  for each row execute function public.enforce_school_change_limit();

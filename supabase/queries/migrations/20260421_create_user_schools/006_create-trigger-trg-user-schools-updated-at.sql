-- Source: migrations/20260421_create_user_schools.sql

-- Statement: 6 of 16

create trigger trg_user_schools_updated_at
  before update on public.user_schools
  for each row execute function public.set_updated_at();

-- Source: migrations/20260421_create_user_schools.sql

-- Statement: 4 of 16

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

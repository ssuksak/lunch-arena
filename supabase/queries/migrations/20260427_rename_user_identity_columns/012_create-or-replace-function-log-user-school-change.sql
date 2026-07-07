-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 12 of 24

create or replace function public.log_user_school_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.school_id is distinct from old.school_id then
    insert into public.user_school_changes(user_key, from_school_id, to_school_id)
    values (new.user_key, old.school_id, new.school_id);
  end if;
  return new;
end;
$$;

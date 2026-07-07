-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 2 of 15

create index if not exists idx_user_school_changes_user_hash_at
  on public.user_school_changes(user_hash, changed_at desc);

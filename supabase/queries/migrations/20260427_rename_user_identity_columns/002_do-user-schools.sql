-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 2 of 24

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_schools' and column_name = 'user_hash')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_schools' and column_name = 'user_key') then
    alter table public.user_schools rename column user_hash to user_key;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_school_changes' and column_name = 'user_hash')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_school_changes' and column_name = 'user_key') then
    alter table public.user_school_changes rename column user_hash to user_key;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ratings' and column_name = 'fingerprint')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ratings' and column_name = 'user_key') then
    alter table public.ratings rename column fingerprint to user_key;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'review_reactions' and column_name = 'fingerprint')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'review_reactions' and column_name = 'user_key') then
    alter table public.review_reactions rename column fingerprint to user_key;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'review_comments' and column_name = 'fingerprint')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'review_comments' and column_name = 'user_key') then
    alter table public.review_comments rename column fingerprint to user_key;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'battle_votes' and column_name = 'fingerprint')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'battle_votes' and column_name = 'user_key') then
    alter table public.battle_votes rename column fingerprint to user_key;
  end if;
end $$;

-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 3 of 24

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'user_hash_format_check')
     and not exists (select 1 from pg_constraint where conname = 'user_key_format_check') then
    alter table public.user_schools rename constraint user_hash_format_check to user_key_format_check;
  end if;

  if exists (select 1 from pg_constraint where conname = 'ratings_meal_fingerprint_unique')
     and not exists (select 1 from pg_constraint where conname = 'ratings_meal_user_key_unique') then
    alter table public.ratings rename constraint ratings_meal_fingerprint_unique to ratings_meal_user_key_unique;
  end if;

  if exists (select 1 from pg_constraint where conname = 'review_reactions_rating_id_fingerprint_key')
     and not exists (select 1 from pg_constraint where conname = 'review_reactions_rating_id_user_key_key') then
    alter table public.review_reactions rename constraint review_reactions_rating_id_fingerprint_key to review_reactions_rating_id_user_key_key;
  end if;

  if exists (select 1 from pg_constraint where conname = 'battle_votes_battle_id_fingerprint_key')
     and not exists (select 1 from pg_constraint where conname = 'battle_votes_battle_id_user_key_key') then
    alter table public.battle_votes rename constraint battle_votes_battle_id_fingerprint_key to battle_votes_battle_id_user_key_key;
  end if;

  if to_regclass('public.idx_user_school_changes_user_hash_at') is not null
     and to_regclass('public.idx_user_school_changes_user_key_at') is null then
    alter index public.idx_user_school_changes_user_hash_at rename to idx_user_school_changes_user_key_at;
  end if;
end $$;

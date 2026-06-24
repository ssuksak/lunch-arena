-- Rename anonymous user identity columns from fingerprint/user_hash to user_key.
-- Existing values are preserved; this only changes column and constraint names.

begin;

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

drop policy if exists user_schools_insert on public.user_schools;
create policy user_schools_insert on public.user_schools
  for insert to anon, authenticated
  with check (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and source in ('toss', 'fp'));

drop policy if exists user_schools_update on public.user_schools;
create policy user_schools_update on public.user_schools
  for update to anon, authenticated
  using (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$')
  with check (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and source in ('toss', 'fp'));

drop policy if exists review_reactions_insert on public.review_reactions;
create policy review_reactions_insert on public.review_reactions
  for insert to anon, authenticated
  with check (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and reaction in ('like', 'dislike'));

drop policy if exists review_comments_insert on public.review_comments;
create policy review_comments_insert on public.review_comments
  for insert to anon, authenticated
  with check (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and char_length(comment) between 1 and 300);

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

revoke all on function public.log_user_school_change() from public, anon, authenticated;

revoke select on public.review_reactions from anon, authenticated;
grant select (id, rating_id, user_key, nickname, reaction, created_at)
  on public.review_reactions to anon, authenticated;

comment on table public.user_schools is '사용자별 선택 학교 저장 (토스 user key 또는 브라우저 fallback key)';
comment on column public.user_schools.user_key is 'toss_xxx 또는 fp_xxx 형식의 앱 사용자 식별키';
comment on column public.user_school_changes.user_key is '학교 변경 이력의 앱 사용자 식별키';
comment on column public.ratings.user_key is '리뷰 작성자의 앱 사용자 식별키';
comment on column public.review_reactions.user_key is '리뷰 반응 작성자의 앱 사용자 식별키';
comment on column public.review_comments.user_key is '댓글 작성자의 앱 사용자 식별키';
comment on column public.battle_votes.user_key is '배틀 투표자의 앱 사용자 식별키';

notify pgrst, 'reload schema';

commit;

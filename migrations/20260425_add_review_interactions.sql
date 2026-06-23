-- Migration: 리뷰 닉네임, 반응, 댓글
-- 작성: 2026-04-25
-- 목적: 리뷰에 작성자 닉네임을 표시하고 좋아요/싫어요 및 댓글을 저장

alter table public.ratings
  add column if not exists nickname text;

alter table public.ratings
  drop constraint if exists ratings_nickname_length_check;
alter table public.ratings
  add constraint ratings_nickname_length_check
  check (nickname is null or char_length(nickname) between 2 and 12);

create table if not exists public.review_reactions (
  id bigserial primary key,
  rating_id bigint not null references public.ratings(id) on delete cascade,
  fingerprint text not null,
  nickname text,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz default now(),
  unique (rating_id, fingerprint)
);

create table if not exists public.review_comments (
  id bigserial primary key,
  rating_id bigint not null references public.ratings(id) on delete cascade,
  fingerprint text not null,
  nickname text,
  comment text not null check (char_length(comment) between 1 and 300),
  created_at timestamptz default now()
);

create index if not exists idx_review_reactions_rating_id on public.review_reactions(rating_id);
create index if not exists idx_review_comments_rating_id_created_at on public.review_comments(rating_id, created_at);

alter table public.review_reactions enable row level security;
alter table public.review_comments enable row level security;

drop policy if exists review_reactions_read on public.review_reactions;
create policy review_reactions_read on public.review_reactions
  for select to anon, authenticated using (true);

drop policy if exists review_reactions_insert on public.review_reactions;
create policy review_reactions_insert on public.review_reactions
  for insert to anon, authenticated
  with check (fingerprint ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and reaction in ('like', 'dislike'));

drop policy if exists review_comments_read on public.review_comments;
create policy review_comments_read on public.review_comments
  for select to anon, authenticated using (true);

drop policy if exists review_comments_insert on public.review_comments;
create policy review_comments_insert on public.review_comments
  for insert to anon, authenticated
  with check (fingerprint ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and char_length(comment) between 1 and 300);

comment on column public.ratings.nickname is '리뷰 작성 당시 사용자 표시 닉네임';
comment on table public.review_reactions is '리뷰별 좋아요/싫어요 반응. 익명 클라이언트에서는 수정/삭제 없이 1회 표시만 허용';
comment on table public.review_comments is '리뷰별 댓글';
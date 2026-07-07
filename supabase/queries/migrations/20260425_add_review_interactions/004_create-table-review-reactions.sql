-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 4 of 20

create table if not exists public.review_reactions (
  id bigserial primary key,
  rating_id bigint not null references public.ratings(id) on delete cascade,
  fingerprint text not null,
  nickname text,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz default now(),
  unique (rating_id, fingerprint)
);

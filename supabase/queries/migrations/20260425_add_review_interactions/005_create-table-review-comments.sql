-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 5 of 20

create table if not exists public.review_comments (
  id bigserial primary key,
  rating_id bigint not null references public.ratings(id) on delete cascade,
  fingerprint text not null,
  nickname text,
  comment text not null check (char_length(comment) between 1 and 300),
  created_at timestamptz default now()
);

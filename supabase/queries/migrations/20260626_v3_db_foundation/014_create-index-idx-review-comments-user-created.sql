-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 14 of 49

create index if not exists idx_review_comments_user_created
  on public.review_comments(user_key, created_at desc);

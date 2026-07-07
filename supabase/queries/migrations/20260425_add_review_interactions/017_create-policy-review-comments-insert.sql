-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 17 of 20

create policy review_comments_insert on public.review_comments
  for insert to anon, authenticated
  with check (fingerprint ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and char_length(comment) between 1 and 300);

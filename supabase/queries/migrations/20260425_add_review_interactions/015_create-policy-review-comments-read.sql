-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 15 of 20

create policy review_comments_read on public.review_comments
  for select to anon, authenticated using (true);

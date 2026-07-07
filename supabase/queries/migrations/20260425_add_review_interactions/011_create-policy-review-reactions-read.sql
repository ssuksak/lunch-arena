-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 11 of 20

create policy review_reactions_read on public.review_reactions
  for select to anon, authenticated using (true);

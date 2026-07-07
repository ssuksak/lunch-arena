-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 13 of 20

create policy review_reactions_insert on public.review_reactions
  for insert to anon, authenticated
  with check (fingerprint ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and reaction in ('like', 'dislike'));

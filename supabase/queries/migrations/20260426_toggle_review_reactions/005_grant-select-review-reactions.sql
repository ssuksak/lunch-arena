-- Source: migrations/20260426_toggle_review_reactions.sql

-- Statement: 5 of 9

grant select (id, rating_id, fingerprint, nickname, reaction, created_at)
  on public.review_reactions to anon, authenticated;

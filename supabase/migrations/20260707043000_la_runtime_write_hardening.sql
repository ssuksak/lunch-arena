drop policy if exists "Public insert la reviews" on public.la_reviews;
drop policy if exists "Owner update la reviews" on public.la_reviews;
drop policy if exists "Owner delete la reviews" on public.la_reviews;
drop policy if exists "Public insert la review comments" on public.la_review_comments;
drop policy if exists "Public insert la review reactions" on public.la_review_reactions;
drop policy if exists "Token delete la review reactions" on public.la_review_reactions;
drop policy if exists "Public insert la battles" on public.la_battles;
drop policy if exists "Public update la battles" on public.la_battles;
drop policy if exists "Public delete la battles" on public.la_battles;
drop policy if exists "Public insert la battle votes" on public.la_battle_votes;

revoke all on public.la_reviews from anon, authenticated;
revoke all on public.la_review_comments from anon, authenticated;
revoke all on public.la_review_reactions from anon, authenticated;
revoke all on public.la_battles from anon, authenticated;
revoke all on public.la_battle_votes from anon, authenticated;

grant select on public.la_reviews to anon, authenticated;
grant select on public.la_review_comments to anon, authenticated;
grant select on public.la_review_reactions to anon, authenticated;
grant select on public.la_battles to anon, authenticated;
grant select on public.la_battle_votes to anon, authenticated;

notify pgrst, 'reload schema';

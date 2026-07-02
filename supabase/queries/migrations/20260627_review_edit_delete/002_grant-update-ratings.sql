-- Source: migrations/20260627_review_edit_delete.sql

-- Statement: 2 of 6

grant update(score, comment, selected_menu_item, nickname) on public.ratings to anon, authenticated;

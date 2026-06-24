-- Store the menu item a user picks as the standout item in a meal review.

alter table public.ratings
  add column if not exists selected_menu_item text;

comment on column public.ratings.selected_menu_item is '리뷰 작성자가 급식 메뉴 중 대표로 고른 메뉴명';

notify pgrst, 'reload schema';
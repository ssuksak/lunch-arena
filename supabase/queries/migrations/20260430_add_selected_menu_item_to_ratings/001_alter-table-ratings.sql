-- Source: migrations/20260430_add_selected_menu_item_to_ratings.sql

-- Statement: 1 of 3

-- Store the menu item a user picks as the standout item in a meal review.

alter table public.ratings
  add column if not exists selected_menu_item text;

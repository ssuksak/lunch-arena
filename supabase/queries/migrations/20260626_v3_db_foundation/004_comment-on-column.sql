-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 4 of 49

comment on column public.ratings.meal_menu_snapshot is '리뷰 작성 당시 메뉴 목록 스냅샷. 오래된 meals 삭제 후에도 리뷰 표시용으로 사용';

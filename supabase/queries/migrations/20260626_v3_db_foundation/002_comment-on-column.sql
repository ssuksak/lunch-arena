-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 2 of 49

comment on column public.ratings.meal_date_snapshot is '리뷰 작성 당시 식단 날짜 스냅샷. 오래된 meals 삭제 후에도 리뷰 표시용으로 사용';

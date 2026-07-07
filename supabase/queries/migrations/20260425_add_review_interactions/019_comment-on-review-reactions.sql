-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 19 of 20

comment on table public.review_reactions is '리뷰별 좋아요/싫어요 반응. 익명 클라이언트에서는 수정/삭제 없이 1회 표시만 허용';

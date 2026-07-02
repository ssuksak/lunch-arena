-- Source: migrations/20260426_toggle_review_reactions.sql

-- Statement: 1 of 9

-- Migration: 리뷰 반응 취소 토글 지원
-- 작성: 2026-04-26
-- 목적: 좋아요/싫어요를 다시 누르면 취소할 수 있도록 취소 토큰 기반 삭제 정책 추가

alter table public.review_reactions
  add column if not exists cancel_token_hash text;

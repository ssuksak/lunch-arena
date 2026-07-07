-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 1 of 20

-- Migration: 리뷰 닉네임, 반응, 댓글
-- 작성: 2026-04-25
-- 목적: 리뷰에 작성자 닉네임을 표시하고 좋아요/싫어요 및 댓글을 저장

alter table public.ratings
  add column if not exists nickname text;

-- Source: migrations/20260423_remove_school_change_limit.sql

-- Statement: 1 of 5

-- Migration: remove school change limit
-- Purpose: allow users to change their own school freely.
-- Keep user_school_changes history for diagnostics, but stop blocking updates.

drop trigger if exists trg_enforce_school_change_limit on public.user_schools;

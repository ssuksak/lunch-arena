-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 1 of 134

-- New Lunch Arena table layer proposal.
-- Date: 2026-06-29
--
-- This file is intentionally a proposal and has not been applied to production.
-- Rule: do not alter existing production tables. This creates only new la_* types,
-- la_* tables, indexes, comments, grants, and RLS policies.

create extension if not exists pgcrypto;

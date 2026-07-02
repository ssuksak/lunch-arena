-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 1 of 24

-- Rename anonymous user identity columns from fingerprint/user_hash to user_key.
-- Existing values are preserved; this only changes column and constraint names.

begin;
